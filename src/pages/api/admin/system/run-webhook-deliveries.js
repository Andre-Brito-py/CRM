import crypto from 'crypto';
import prisma from '@/prisma/index';
import { createPlatformAuditActivity } from '@/prisma/services/activity';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

const MAX_WEBHOOK_DELIVERY_ATTEMPTS = 5;
const computeBackoffMs = ({ attempt, baseMs = 60_000, capMs = 60 * 60_000 }) => {
  const n = Number(attempt || 1);
  const exp = Math.max(0, n - 1);
  const raw = Math.min(capMs, baseMs * Math.pow(2, exp));
  const jitter = Math.floor(Math.random() * Math.min(10_000, Math.max(250, raw * 0.2)));
  return raw + jitter;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: 'Method not supported' } });
  }

  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const lockKey = 'admin:run-webhook-deliveries';

  try {
    const lockRows = await prisma.$queryRaw`SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked`;
    const locked = Boolean(lockRows?.[0]?.locked);
    if (!locked) {
      return res.status(200).json({ data: { skipped: true, reason: 'locked' } });
    }

    const now = new Date();
    const deliveries = await prisma.webhookDelivery.findMany({
      where: {
        status: 'PENDING',
        nextRetryAt: { lte: now },
        attempts: { lt: MAX_WEBHOOK_DELIVERY_ATTEMPTS },
        webhook: { isActive: true },
      },
      include: { webhook: true },
      take: 50,
      orderBy: { nextRetryAt: 'asc' },
    });

    let processed = 0;

    for (const delivery of deliveries) {
      const claimed = await prisma.webhookDelivery.updateMany({
        where: {
          id: delivery.id,
          status: 'PENDING',
          nextRetryAt: { lte: now },
        },
        data: {
          attempts: { increment: 1 },
          nextRetryAt: new Date(now.getTime() + 10 * 60_000),
        },
      });

      if (claimed.count === 0) continue;

      const attempt = Number(delivery.attempts || 0) + 1;
      const payload = delivery.payload || {};
      const rawBody = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const signature = crypto
        .createHmac('sha256', delivery.webhook.secret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      try {
        const response = await fetch(delivery.webhook.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-vysify-event': payload.event,
            'x-vysify-timestamp': timestamp,
            'x-vysify-signature': `sha256=${signature}`,
          },
          body: rawBody,
          signal: controller.signal,
        });

        const responseBody = await response.text();
        const isSuccess = response.ok;

        const shouldRetry = !isSuccess && attempt < MAX_WEBHOOK_DELIVERY_ATTEMPTS;
        const nextRetryAt = shouldRetry ? new Date(Date.now() + computeBackoffMs({ attempt })) : null;
        const status = isSuccess ? 'SUCCESS' : shouldRetry ? 'PENDING' : 'FAILED';

        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status,
            responseCode: response.status,
            responseBody: responseBody.substring(0, 500),
            nextRetryAt,
          },
        });
      } catch (error) {
        const shouldRetry = attempt < MAX_WEBHOOK_DELIVERY_ATTEMPTS;
        const nextRetryAt = shouldRetry ? new Date(Date.now() + computeBackoffMs({ attempt })) : null;
        const status = shouldRetry ? 'PENDING' : 'FAILED';

        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status,
            responseCode: 0,
            responseBody: error?.message || 'Unknown Error',
            nextRetryAt,
          },
        });
      } finally {
        clearTimeout(timeout);
      }

      processed += 1;
    }

    await createPlatformAuditActivity(
      session.user.userId || session.user.id,
      session.user.email,
      {
        action: 'RUN_WEBHOOK_DELIVERIES',
        title: 'Admin ran webhook deliveries',
        target: null,
        metadata: { processed, total: deliveries.length },
      },
      req
    );

    return res.status(200).json({ data: { processed, total: deliveries.length } });
  } catch (error) {
    return res.status(500).json({ error: { msg: error?.message || 'Failed to run webhook deliveries' } });
  } finally {
    try {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
    } catch {
      null;
    }
  }
}
