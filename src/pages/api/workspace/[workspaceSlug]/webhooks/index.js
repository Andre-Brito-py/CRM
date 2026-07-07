import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';
import { getWorkspace } from '@/prisma/services/workspace';
import { getWebhooks, createWebhook } from '@/prisma/services/webhook';
import { createAuditActivity } from '@/prisma/services/activity';
import prisma from '@/prisma/index';
import { canAddWebhook } from '@/lib/server/subscription';
import { rateLimit } from '@/lib/server/rateLimit';
import { getSystemConfig } from '@/lib/server/config';

const normalizeEvents = (value) => {
  if (Array.isArray(value)) {
    const events = value.map((e) => `${e}`.trim()).filter(Boolean);
    return events.length > 0 ? events : ['*'];
  }
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return ['*'];
    const events = raw.split(',').map((e) => e.trim()).filter(Boolean);
    return events.length > 0 ? events : ['*'];
  }
  return ['*'];
};

const parseBool = (value, fallback = false) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'y') return true;
  if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'n') return false;
  return fallback;
};

const parseCsv = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
};

const getUrlHost = (value) => {
  const u = new URL(String(value || ''));
  return String(u.hostname || '').toLowerCase();
};

const handler = async (req, res) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workspaceSlug } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  if (req.method === 'GET') {
    const webhooks = await getWebhooks(workspace.id);
    return res.status(200).json({ webhooks });
  }

  if (req.method === 'POST') {
    const userId = session.user.userId || session.user.id;
    const rl = await rateLimit({ req, limit: 30, windowMs: 60_000, key: `u:${userId}:webhooks:create:1m` });
    if (!rl.ok) {
      return res.status(429).json({ error: { msg: 'Too Many Requests', requestId } });
    }

    const { url, events } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let parsedHost = null;
    try {
      const u = new URL(String(url));
      const protocol = String(u.protocol || '').toLowerCase();
      if (protocol !== 'http:' && protocol !== 'https:') {
        return res.status(400).json({ error: { msg: 'Invalid URL protocol' } });
      }
      parsedHost = getUrlHost(url);
    } catch {
      return res.status(400).json({ error: { msg: 'Invalid URL' } });
    }

    const isZapierHook = parsedHost?.endsWith('zapier.com');
    if (isZapierHook) {
      const [enabledRaw, allowedHostsRaw] = await Promise.all([
        getSystemConfig('ZAPIER_ENABLED', 'false'),
        getSystemConfig('ZAPIER_ALLOWED_HOSTS', 'hooks.zapier.com'),
      ]);
      const enabled = parseBool(enabledRaw, false);
      const allowedHosts = parseCsv(allowedHostsRaw);
      const hostAllowed = allowedHosts.length === 0 || allowedHosts.some((h) => parsedHost === h || parsedHost.endsWith(`.${h}`));
      if (!hostAllowed) {
        return res.status(400).json({ error: { msg: 'Zapier host not allowed' } });
      }
      if (!enabled) {
        return res.status(403).json({ error: { msg: 'Zapier is disabled by the platform administrator' } });
      }
    }

    const isSuperAdmin = session?.user?.role === 'SUPERADMIN';
    if (!isSuperAdmin) {
      const currentWebhookCount = await prisma.webhook.count({
        where: { workspaceId: workspace.id, deletedAt: null, isActive: true },
      });
      const isAllowed = await canAddWebhook(workspace.id, currentWebhookCount);
      if (!isAllowed) {
        return res.status(403).json({
          error: {
            msg: 'LIMIT_REACHED',
            details: 'Você atingiu o limite de webhooks do seu plano. Faça um upgrade para adicionar mais.',
          },
        });
      }
    }

    const webhook = await createWebhook(workspace.id, url, normalizeEvents(events));
    await createAuditActivity(
      workspace.id,
      session.user.userId,
      {
        action: 'WEBHOOK_CREATE',
        title: 'Webhook created',
        target: { webhookId: webhook?.id || null },
        metadata: { url, events: normalizeEvents(events) },
      },
      req
    );
    return res.status(201).json({ webhook });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default handler;
