/**
 * /api/worker/process-webhooks
 *
 * Internal worker that dequeues and processes inbound webhook events stored
 * in the `webhook_events` table. This endpoint is called:
 *   1. Immediately (fire-and-forget) by the webhook receiver routes.
 *   2. Every minute by the cron job at /api/cron/process-webhooks.
 *
 * It is protected by CRON_SECRET in production and uses a PostgreSQL Advisory
 * Lock to ensure only one instance runs at a time (safe for concurrent deploys).
 */

import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';
import { getSystemConfig } from '@/lib/server/config';

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 5;
const LOCK_KEY = 'worker:process-webhooks';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- Auth check (skip in development) ---
  if (process.env.NODE_ENV === 'production') {
    const secret = await getSystemConfig('CRON_SECRET', process.env.CRON_SECRET);
    if (!secret) {
      return res.status(500).json({ error: 'CRON_SECRET not configured' });
    }
    const authHeader = req.headers.authorization;
    const headerSecret = req.headers['x-cron-secret'];
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (headerSecret !== secret && bearer !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // --- Advisory Lock to prevent concurrent runs ---
  let locked = false;
  try {
    const lockRows = await prisma.$queryRaw`SELECT pg_try_advisory_lock(hashtext(${LOCK_KEY})) AS locked`;
    locked = Boolean(lockRows?.[0]?.locked);
    if (!locked) {
      return res.status(200).json({ success: true, skipped: true, reason: 'already_running' });
    }
  } catch (error) {
    log({ level: 'error', msg: 'webhook_worker_lock_failed', error });
    return res.status(500).json({ error: 'Lock acquisition failed' });
  }

  let processed = 0;
  let failed = 0;

  try {
    // Fetch a batch of PENDING events, ordered oldest first
    const events = await prisma.webhookEvent.findMany({
      where: {
        status: 'PENDING',
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    for (const event of events) {
      // Optimistic claim: atomically move to PROCESSING only if still PENDING
      const claimed = await prisma.webhookEvent.updateMany({
        where: { id: event.id, status: 'PENDING' },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
        },
      });

      if (claimed.count === 0) continue; // another worker got it first

      try {
        await dispatchEvent(event);

        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: { status: 'COMPLETED' },
        });
        processed++;
      } catch (error) {
        const isLastAttempt = event.attempts + 1 >= MAX_ATTEMPTS;
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: isLastAttempt ? 'FAILED' : 'PENDING',
            lastError: String(error?.message || 'unknown_error').slice(0, 1000),
          },
        });
        log({
          level: 'warn',
          msg: 'webhook_worker_event_failed',
          eventId: event.id,
          provider: event.provider,
          attempt: event.attempts + 1,
          isLastAttempt,
          error: error?.message,
        });
        failed++;
      }
    }

    return res.status(200).json({ success: true, processed, failed, total: events.length });
  } catch (error) {
    log({ level: 'error', msg: 'webhook_worker_run_failed', error });
    reportError(error, { route: '/api/worker/process-webhooks' });
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    if (locked) {
      try {
        await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${LOCK_KEY}))`;
      } catch (e) {
        log({ level: 'warn', msg: 'webhook_worker_unlock_failed', error: e });
      }
    }
  }
}

/**
 * Routes the event to the correct processing function based on provider.
 */
async function dispatchEvent(event) {
  const { provider, payload } = event;

  if (provider === 'WHATSAPP') {
    const { processIncomingWhatsAppEvent } = await import('@/lib/server/webhook-processors/whatsapp');
    await processIncomingWhatsAppEvent(payload);
    return;
  }

  if (provider === 'INSTAGRAM') {
    const { processIncomingInstagramEvent } = await import('@/lib/server/webhook-processors/instagram');
    await processIncomingInstagramEvent(payload);
    return;
  }

  throw new Error(`Unknown provider: ${provider}`);
}
