import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { canAddWhatsAppIntegration } from '@/lib/server/subscription';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';
import { createAuditActivity } from '@/prisma/services/activity';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '128kb',
    },
  },
};

const asTrimmedString = (value, maxLen) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (raw.length > maxLen) return null;
  return raw;
};

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const { workspaceSlug } = req.query;
  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  if (!workspace) {
    res.status(404).json({ error: { msg: 'Workspace not found' } });
    return;
  }

  const isMember = workspace.members.some(
    (member) => member.email === session.user.email
  );

  if (!isMember) {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  if (req.method === 'GET') {
    try {
      const integrations = await prisma.integration.findMany({
        where: {
          workspaceId: workspace.id,
          provider: { in: ['WHATSAPP', 'whatsapp'] },
        },
      });

      res.status(200).json({ data: { integrations } });
    } catch (error) {
      log({ level: 'error', msg: 'whatsapp_integrations_list_failed', requestId, workspaceId: workspace.id, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/whatsapp', requestId, workspaceId: workspace.id });
      res.status(500).json({ error: { msg: 'Failed to fetch integrations' } });
    }
  } else if (req.method === 'POST') {
    const userId = session.user.userId || session.user.id;
    const rl = await rateLimit({ req, limit: 10, windowMs: 10 * 60_000, key: `u:${userId}:whatsapp:integration:create` });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'whatsapp_integration_rate_limited', requestId, workspaceId: workspace.id, userId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    const { name, enabled, phoneNumberId, accessToken, verifyToken, businessAccountId } = req.body || {};
    const safeName = asTrimmedString(name, 80);
    const safePhoneNumberId = asTrimmedString(phoneNumberId, 128);
    const safeAccessToken = asTrimmedString(accessToken, 2048);
    const safeVerifyToken = asTrimmedString(verifyToken, 256);
    const safeBusinessAccountId = asTrimmedString(businessAccountId, 128);

    if (!safePhoneNumberId || !safeAccessToken || !safeVerifyToken) {
      return res.status(400).json({ error: { msg: 'Missing required fields' } });
    }

    try {
      // 1. Check current amount of WhatsApp integrations
      const currentCount = await prisma.integration.count({
        where: {
          workspaceId: workspace.id,
          provider: { in: ['WHATSAPP', 'whatsapp'] }
        }
      });

      // 2. Validate against Subscription Limit (only if creating a NEW one)
      const isSuperAdmin = session?.user?.role === 'SUPERADMIN';
      if (!isSuperAdmin && currentCount === 0) {
        const canAdd = await canAddWhatsAppIntegration(workspace.id, currentCount);
        if (!canAdd) {
          return res.status(403).json({ error: { msg: 'LIMIT_REACHED', details: 'Please upgrade your plan to add more WhatsApp numbers.' } });
        }
      }

      // 3. Upsert the integration (Update if exists, Create if not)
      const integration = await prisma.integration.upsert({
        where: {
          workspaceId_provider: {
            workspaceId: workspace.id,
            provider: 'WHATSAPP'
          }
        },
        update: {
          name: safeName || `WhatsApp Number`,
          enabled: enabled !== false,
          credentials: {
            phoneNumberId: safePhoneNumberId,
            accessToken: safeAccessToken,
            verifyToken: safeVerifyToken,
            businessAccountId: safeBusinessAccountId,
          },
        },
        create: {
          workspaceId: workspace.id,
          provider: 'WHATSAPP',
          name: safeName || `WhatsApp Number`,
          enabled: enabled !== false,
          credentials: {
            phoneNumberId: safePhoneNumberId,
            accessToken: safeAccessToken,
            verifyToken: safeVerifyToken,
            businessAccountId: safeBusinessAccountId,
          },
        },
      });

      await createAuditActivity(
        workspace.id,
        session.user.userId || session.user.id,
        {
          action: 'INTEGRATION_CREATE_WHATSAPP',
          title: 'WhatsApp integration created',
          target: { integrationId: integration.id },
          metadata: { provider: 'WHATSAPP', name: integration.name, enabled: integration.enabled },
        },
        req
      );

      res.status(200).json({ data: { integration } });
    } catch (error) {
      log({ level: 'error', msg: 'whatsapp_integration_create_failed', requestId, workspaceId: workspace.id, userId: session.user.userId, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/whatsapp', requestId, workspaceId: workspace.id });
      res.status(500).json({ error: { msg: 'Failed to add integration' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
