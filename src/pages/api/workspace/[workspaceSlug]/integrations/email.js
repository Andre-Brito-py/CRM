import { getSession } from 'next-auth/react';
import crypto from 'crypto';

import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';
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

const buildPublicUrl = (req, path) => {
  const proto = `${req.headers['x-forwarded-proto'] || 'https'}`.split(',')[0].trim();
  const host = `${req.headers['x-forwarded-host'] || req.headers.host}`.split(',')[0].trim();
  return `${proto}://${host}${path}`;
};

const generateToken = () => crypto.randomBytes(24).toString('hex');

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const { workspaceSlug } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const userId = session.user.userId || session.user.id;

  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);
  if (!workspace) {
    res.status(404).json({ error: { msg: 'Workspace not found' } });
    return;
  }

  const isMember = workspace.members.some((m) => m.email === session.user.email);
  if (!isMember) {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  const inboundUrl = buildPublicUrl(req, `/api/integrations/email/inbound?workspace=${encodeURIComponent(workspace.slug)}`);

  if (req.method === 'GET') {
    try {
      const integration = await prisma.integration.findFirst({
        where: { workspaceId: workspace.id, provider: 'EMAIL' },
        select: { id: true, enabled: true, credentials: true },
      });

      const token = integration?.credentials?.inboundToken ? String(integration.credentials.inboundToken) : null;
      res.status(200).json({
        data: {
          enabled: integration?.enabled || false,
          inboundUrl,
          inboundToken: token,
        },
      });
    } catch (error) {
      log({ level: 'error', msg: 'email_integration_get_failed', requestId, workspaceId: workspace.id, userId, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/email', requestId, workspaceId: workspace.id, userId });
      res.status(500).json({ error: { msg: 'Failed to fetch integration' } });
    }
    return;
  }

  if (req.method === 'POST') {
    const rl = await rateLimit({ req, limit: 10, windowMs: 10 * 60_000, key: `u:${userId}:email:integration:update` });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'email_integration_rate_limited', requestId, workspaceId: workspace.id, userId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    const enabled = Boolean(req.body?.enabled);
    try {
      const current = await prisma.integration.findFirst({
        where: { workspaceId: workspace.id, provider: 'EMAIL' },
        select: { id: true, enabled: true, credentials: true },
      });

      const currentToken = current?.credentials?.inboundToken ? String(current.credentials.inboundToken) : null;
      const nextToken = enabled ? (currentToken || generateToken()) : currentToken;

      const integration = await prisma.integration.upsert({
        where: current?.id ? { id: current.id } : { workspaceId_provider: { workspaceId: workspace.id, provider: 'EMAIL' } },
        update: {
          enabled,
          name: 'Email Inbox',
          credentials: {
            ...(current?.credentials || {}),
            inboundToken: nextToken,
          },
        },
        create: {
          workspaceId: workspace.id,
          provider: 'EMAIL',
          name: 'Email Inbox',
          enabled,
          credentials: enabled ? { inboundToken: nextToken } : {},
        },
      });

      await createAuditActivity(
        workspace.id,
        userId,
        {
          action: 'INTEGRATION_UPDATE_EMAIL',
          title: 'Email Inbox integration updated',
          target: { integrationId: integration.id },
          metadata: { provider: 'EMAIL', enabled: integration.enabled },
        },
        req
      );

      res.status(200).json({
        data: {
          enabled: integration.enabled,
          inboundUrl,
          inboundToken: integration.credentials?.inboundToken ? String(integration.credentials.inboundToken) : null,
        },
      });
    } catch (error) {
      log({ level: 'error', msg: 'email_integration_update_failed', requestId, workspaceId: workspace.id, userId, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/email', requestId, workspaceId: workspace.id, userId });
      res.status(500).json({ error: { msg: 'Failed to update integration' } });
    }
    return;
  }

  if (req.method === 'PATCH') {
    const rl = await rateLimit({ req, limit: 5, windowMs: 10 * 60_000, key: `u:${userId}:email:integration:rotate` });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'email_integration_rotate_rate_limited', requestId, workspaceId: workspace.id, userId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    try {
      const integration = await prisma.integration.upsert({
        where: { workspaceId_provider: { workspaceId: workspace.id, provider: 'EMAIL' } },
        update: {
          enabled: true,
          name: 'Email Inbox',
          credentials: {
            inboundToken: generateToken(),
          },
        },
        create: {
          workspaceId: workspace.id,
          provider: 'EMAIL',
          name: 'Email Inbox',
          enabled: true,
          credentials: {
            inboundToken: generateToken(),
          },
        },
      });

      await createAuditActivity(
        workspace.id,
        userId,
        {
          action: 'INTEGRATION_ROTATE_EMAIL_TOKEN',
          title: 'Email Inbox token rotated',
          target: { integrationId: integration.id },
          metadata: { provider: 'EMAIL' },
        },
        req
      );

      res.status(200).json({
        data: {
          enabled: integration.enabled,
          inboundUrl,
          inboundToken: String(integration.credentials?.inboundToken || ''),
        },
      });
    } catch (error) {
      log({ level: 'error', msg: 'email_integration_rotate_failed', requestId, workspaceId: workspace.id, userId, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/email', requestId, workspaceId: workspace.id, userId });
      res.status(500).json({ error: { msg: 'Failed to rotate token' } });
    }
    return;
  }

  res.status(405).json({ error: { msg: 'Method not supported' } });
}

