/**
 * /api/integrations/whatsapp/webhook
 *
 * Thin "receiver" route for the Meta WhatsApp Cloud API webhook.
 *
 * GET  → Webhook verification handshake (hub.challenge).
 * POST → Receives inbound events, enqueues them in `webhook_events` table,
 *        kicks the async worker (fire-and-forget), and immediately returns
 *        200 OK to Meta — well within their 20-second timeout window.
 *
 * All business logic (contact upsert, message creation, automations, AI
 * transcription, autopilot) lives in:
 *   src/lib/server/webhook-processors/whatsapp.js
 * and is executed by:
 *   src/pages/api/worker/process-webhooks.js
 */

import prisma from '@/prisma/index';
import { log } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';
import { getSystemConfig } from '@/lib/server/config';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  // ------------------------------------------------------------------ GET: Verification
  if (req.method === 'GET') {
    const rl = await rateLimit({ req, limit: 120, windowMs: 60_000 });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'whatsapp_webhook_verify_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const workspaceSlug = req.query['workspace'];

    if (mode && token) {
      if (mode === 'subscribe' && workspaceSlug) {
        const workspace = await prisma.workspace.findFirst({
          where: { slug: { equals: workspaceSlug, mode: 'insensitive' } },
          include: {
            integrations: { where: { provider: { in: ['WHATSAPP', 'whatsapp'] } } },
          },
        });

        const integration = workspace?.integrations.find((i) => {
          const creds =
            typeof i.credentials === 'string'
              ? JSON.parse(i.credentials || '{}')
              : i.credentials || {};
          return String(creds?.verifyToken || '').trim() === String(token).trim();
        });

        if (integration) {
          log({ level: 'info', msg: 'whatsapp_webhook_verified', requestId, workspaceSlug });
          res.setHeader('Content-Type', 'text/plain');
          return res.status(200).send(challenge);
        } else {
          log({ level: 'warn', msg: 'whatsapp_webhook_verify_failed', requestId, workspaceSlug });
          return res.status(403).json({ error: 'Verification failed' });
        }
      } else {
        return res.status(403).json({ error: 'Verification failed' });
      }
    } else {
      return res.status(400).json({ error: 'Missing parameters' });
    }

  // ------------------------------------------------------------------ POST: Receive Event
  } else if (req.method === 'POST') {
    const rl = await rateLimit({ req, limit: 600, windowMs: 60_000 });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'whatsapp_webhook_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    const body = req.body;
    const workspaceSlug = req.query['workspace'];

    if (!workspaceSlug) {
      return res.status(400).json({ error: 'Missing workspace parameter' });
    }

    log({
      level: 'info',
      msg: 'whatsapp_webhook_received',
      requestId,
      workspaceSlug,
      hasObject: Boolean(body?.object),
      entryCount: Array.isArray(body?.entry) ? body.entry.length : 0,
    });

    if (!body?.object) {
      return res.status(404).send('Not Found');
    }

    // Only enqueue real message events (ignore status updates, reactions, etc.)
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      // 1. Persist event to the queue table
      try {
        await prisma.webhookEvent.create({
          data: {
            provider: 'WHATSAPP',
            workspaceId: workspaceSlug, // stored as slug; worker resolves to real ID
            payload: { workspaceSlug, body },
            status: 'PENDING',
          },
        });
      } catch (enqueueError) {
        log({
          level: 'error',
          msg: 'whatsapp_webhook_enqueue_failed',
          requestId,
          workspaceSlug,
          error: enqueueError,
        });
        // Do NOT return 500 — we still ACK Meta to prevent aggressive retries
      }

      // 2. Fire-and-forget: kick the worker so the message appears in < 1 second
      //    If this call fails (Vercel frozen), the cron job at
      //    /api/cron/process-webhooks picks it up within 1 minute.
      try {
        const secret = await getSystemConfig('CRON_SECRET', process.env.CRON_SECRET);
        const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.host}`;
        fetch(`${baseUrl}/api/worker/process-webhooks`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(secret ? { 'x-cron-secret': secret } : {}),
          },
        }).catch(() => {
          // Intentionally silent — cron is the safety net
        });
      } catch {
        // Intentionally silent
      }
    }

    // Always ACK Meta immediately — never block on processing
    return res.status(200).send('OK');

  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
