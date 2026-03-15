import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { canAddInstagramIntegration } from '@/lib/server/subscription';
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
          provider: 'INSTAGRAM',
        },
      });

      res.status(200).json({ data: { integrations } });
    } catch (error) {
      log({ level: 'error', msg: 'instagram_integrations_list_failed', requestId, workspaceId: workspace.id, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/instagram', requestId, workspaceId: workspace.id });
      res.status(500).json({ error: { msg: 'Failed to fetch integrations' } });
    }
  } else if (req.method === 'POST') {
    const userId = session.user.userId || session.user.id;
    const rl = await rateLimit({ req, limit: 10, windowMs: 10 * 60_000, key: `u:${userId}:instagram:integration:create` });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'instagram_integration_rate_limited', requestId, workspaceId: workspace.id, userId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    const { name, enabled, pageId, instagramId, accessToken, verifyToken } = req.body || {};
    const safeName = asTrimmedString(name, 80);
    const safePageId = asTrimmedString(pageId, 128);
    const safeInstagramId = asTrimmedString(instagramId, 128);
    const safeAccessToken = asTrimmedString(accessToken, 2048);
    const safeVerifyToken = asTrimmedString(verifyToken, 256);

    if (!safePageId || !safeInstagramId || !safeAccessToken || !safeVerifyToken) {
      return res.status(400).json({ error: { msg: 'Missing required fields' } });
    }

    try {
      // 1. Check current amount of Instagram integrations
      const currentCount = await prisma.integration.count({
        where: {
          workspaceId: workspace.id,
          provider: 'INSTAGRAM'
        }
      });

      // 2. Validate against Subscription Limit
      const isSuperAdmin = session?.user?.role === 'SUPERADMIN';
      if (!isSuperAdmin) {
        const canAdd = await canAddInstagramIntegration(workspace.id, currentCount);
        if (!canAdd) {
          return res.status(403).json({ error: { msg: 'LIMIT_REACHED', details: 'Please upgrade your plan to add more Instagram accounts.' } });
        }
      }

      // 3. Create the new integration
      const integration = await prisma.integration.create({
        data: {
          workspaceId: workspace.id,
          provider: 'INSTAGRAM',
          name: safeName || `Instagram Account ${currentCount + 1}`,
          enabled: enabled !== false,
          credentials: {
            pageId: safePageId,
            instagramId: safeInstagramId,
            accessToken: safeAccessToken,
            verifyToken: safeVerifyToken,
          },
        },
      });

      await createAuditActivity(
        workspace.id,
        session.user.userId || session.user.id,
        {
          action: 'INTEGRATION_CREATE_INSTAGRAM',
          title: 'Instagram integration created',
          target: { integrationId: integration.id },
          metadata: { provider: 'INSTAGRAM', name: integration.name, enabled: integration.enabled },
        },
        req
      );

      res.status(200).json({ data: { integration } });
    } catch (error) {
      log({ level: 'error', msg: 'instagram_integration_create_failed', requestId, workspaceId: workspace.id, userId: session.user.userId, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/instagram', requestId, workspaceId: workspace.id });
      res.status(500).json({ error: { msg: 'Failed to add integration' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
