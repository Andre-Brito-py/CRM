import { processSlaBreachAutomations } from '@/prisma/services/automation';
import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const lockKey = 'cron:check-sla';
  if (process.env.NODE_ENV === 'production') {
    const secret = await getSystemConfig('CRON_SECRET', process.env.CRON_SECRET);
    if (!secret) return res.status(500).json({ message: 'CRON_SECRET not configured' });
    const authHeader = req.headers.authorization;
    const headerSecret = req.headers['x-cron-secret'];
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (headerSecret !== secret && bearer !== secret) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }

  try {
    const lockRows = await prisma.$queryRaw`SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked`;
    const locked = Boolean(lockRows?.[0]?.locked);
    if (!locked) {
      return res.status(200).json({ success: true, skipped: true, reason: 'locked' });
    }

    await processSlaBreachAutomations();
    res.status(200).json({ success: true, message: 'SLA breaches processed.' });
  } catch (error) {
    log({ level: 'error', msg: 'cron_check_sla_failed', requestId, error });
    reportError(error, { route: '/api/cron/check-sla', requestId });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    try {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
    } catch (error) {
      log({ level: 'warn', msg: 'cron_check_sla_unlock_failed', requestId, error });
    }
  }
}
