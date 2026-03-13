import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import { getWebhooks, createWebhook } from '@/prisma/services/webhook';
import { createAuditActivity } from '@/prisma/services/activity';
import prisma from '@/prisma/index';
import { canAddWebhook } from '@/lib/server/subscription';
import { rateLimit } from '@/lib/server/rateLimit';

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

const handler = async (req, res) => {
  const session = await getSession({ req });
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

    const isSuperAdmin = session?.user?.role === 'SUPERADMIN';
    if (!isSuperAdmin) {
      const currentWebhookCount = await prisma.webhook.count({
        where: { workspaceId: workspace.id, deletedAt: null, isActive: true },
      });
      const isAllowed = await canAddWebhook(workspace.creator?.email, currentWebhookCount);
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
