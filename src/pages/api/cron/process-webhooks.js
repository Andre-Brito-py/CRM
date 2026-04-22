/**
 * /api/cron/process-webhooks
 *
 * Scheduled cron job that triggers the webhook worker every minute.
 * This acts as the safety net: even if the fire-and-forget fetch from
 * the webhook receiver fails, pending events will still be picked up here.
 *
 * Configure in vercel.json or your hosting provider's cron scheduler:
 *   { "path": "/api/cron/process-webhooks", "schedule": "* * * * *" }
 */

import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

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

  try {
    log({ level: 'info', msg: 'cron_process_webhooks_triggered', requestId });

    // Delegate all processing to the worker — pass auth header forward
    const secret = await getSystemConfig('CRON_SECRET', process.env.CRON_SECRET);
    const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.host}`;
    const workerUrl = `${baseUrl}/api/worker/process-webhooks`;

    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(secret ? { 'x-cron-secret': secret } : {}),
      },
    });

    const result = await response.json().catch(() => ({}));
    log({ level: 'info', msg: 'cron_process_webhooks_done', requestId, result });
    return res.status(200).json({ success: true, worker: result });
  } catch (error) {
    log({ level: 'error', msg: 'cron_process_webhooks_failed', requestId, error });
    reportError(error, { route: '/api/cron/process-webhooks', requestId });
    return res.status(500).json({ success: false, error: error.message });
  }
}
