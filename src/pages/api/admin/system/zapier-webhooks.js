import crypto from 'crypto';

import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';
import { getSystemConfig, upsertSystemConfig } from '@/lib/server/config';
import { createPlatformAuditActivity } from '@/prisma/services/activity';

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

const isZapierUrl = (value) => {
  try {
    const u = new URL(String(value || ''));
    const host = String(u.hostname || '').toLowerCase();
    return host.endsWith('zapier.com');
  } catch {
    return false;
  }
};

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const [enabledRaw, allowedHostsRaw, webhooks] = await Promise.all([
      getSystemConfig('ZAPIER_ENABLED', 'false'),
      getSystemConfig('ZAPIER_ALLOWED_HOSTS', 'hooks.zapier.com'),
      prisma.webhook.findMany({
        where: {
          deletedAt: null,
          OR: [{ url: { contains: 'zapier.com', mode: 'insensitive' } }],
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
        include: {
          workspace: { select: { id: true, name: true, slug: true, createdAt: true } },
        },
      }),
    ]);

    const allowedHosts = parseCsv(allowedHostsRaw);
    const enabled = parseBool(enabledRaw, false);

    return res.status(200).json({
      data: {
        enabled,
        allowedHosts,
        webhooks: (webhooks || [])
          .filter((w) => isZapierUrl(w.url))
          .map((w) => ({
            id: w.id,
            url: w.url,
            events: w.events,
            isActive: w.isActive,
            secretMasked: w.secret ? `${w.secret.slice(0, 6)}…${w.secret.slice(-4)}` : '',
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
            workspace: w.workspace,
          })),
      },
    });
  }

  if (req.method === 'PATCH') {
    const actorId = session.user.userId || session.user.id;
    const actorEmail = session.user.email;
    const { action } = req.body || {};

    if (action === 'SET_ENABLED') {
      const nextEnabled = Boolean(req.body?.enabled);
      await upsertSystemConfig({
        key: 'ZAPIER_ENABLED',
        value: nextEnabled ? 'true' : 'false',
        category: 'INTEGRATIONS',
        encrypt: false,
      });

      await createPlatformAuditActivity(
        actorId,
        actorEmail,
        {
          action: 'ZAPIER_SETTINGS_UPDATE',
          title: 'Zapier settings updated',
          metadata: { enabled: nextEnabled },
        },
        req
      );

      return res.status(200).json({ data: { saved: true } });
    }

    if (action === 'SET_ALLOWED_HOSTS') {
      const hostsRaw = String(req.body?.allowedHosts ?? '').trim();
      await upsertSystemConfig({
        key: 'ZAPIER_ALLOWED_HOSTS',
        value: hostsRaw,
        category: 'INTEGRATIONS',
        encrypt: false,
      });

      await createPlatformAuditActivity(
        actorId,
        actorEmail,
        {
          action: 'ZAPIER_SETTINGS_UPDATE',
          title: 'Zapier settings updated',
          metadata: { allowedHosts: parseCsv(hostsRaw) },
        },
        req
      );

      return res.status(200).json({ data: { saved: true } });
    }

    if (action === 'SET_WEBHOOK_ACTIVE') {
      const webhookId = String(req.body?.webhookId || '').trim();
      const isActive = Boolean(req.body?.isActive);
      if (!webhookId) return res.status(400).json({ error: { msg: 'Missing webhookId' } });

      const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
      if (!webhook || webhook.deletedAt) return res.status(404).json({ error: { msg: 'Webhook not found' } });
      if (!isZapierUrl(webhook.url)) return res.status(400).json({ error: { msg: 'Not a Zapier webhook' } });

      const updated = await prisma.webhook.update({
        where: { id: webhookId },
        data: { isActive },
        select: { id: true, isActive: true, updatedAt: true },
      });

      await createPlatformAuditActivity(
        actorId,
        actorEmail,
        {
          action: 'ZAPIER_WEBHOOK_TOGGLE',
          title: 'Zapier webhook toggled',
          target: { webhookId },
          metadata: { isActive },
        },
        req
      );

      return res.status(200).json({ data: { webhook: updated } });
    }

    if (action === 'ROTATE_WEBHOOK_SECRET') {
      const webhookId = String(req.body?.webhookId || '').trim();
      if (!webhookId) return res.status(400).json({ error: { msg: 'Missing webhookId' } });

      const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
      if (!webhook || webhook.deletedAt) return res.status(404).json({ error: { msg: 'Webhook not found' } });
      if (!isZapierUrl(webhook.url)) return res.status(400).json({ error: { msg: 'Not a Zapier webhook' } });

      const secret = `wh_${crypto.randomBytes(24).toString('hex')}`;
      const updated = await prisma.webhook.update({
        where: { id: webhookId },
        data: { secret },
        select: { id: true, secret: true, updatedAt: true },
      });

      await createPlatformAuditActivity(
        actorId,
        actorEmail,
        {
          action: 'ZAPIER_WEBHOOK_ROTATE_SECRET',
          title: 'Zapier webhook secret rotated',
          target: { webhookId },
        },
        req
      );

      return res.status(200).json({ data: { webhook: updated } });
    }

    return res.status(400).json({ error: { msg: 'Invalid action' } });
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ error: { msg: `Method ${req.method} Not Allowed` } });
}

