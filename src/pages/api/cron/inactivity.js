import { processGlobalInactivityAutomation } from '@/prisma/services/automation';
import { log, reportError } from '@/lib/server/logger';
import { getSystemConfig } from '@/lib/server/config';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const lockKey = 'cron:inactivity';

  try {
    const requestId = String(req.headers['x-request-id'] || '').trim() || null;

    if (process.env.NODE_ENV === 'production') {
      const secret = await getSystemConfig('CRON_SECRET', process.env.CRON_SECRET);
      if (!secret) {
        return res.status(500).json({ error: 'CRON_SECRET not configured' });
      }
      const authHeader = req.headers.authorization;
      const headerSecret = req.headers['x-cron-secret'];
      const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
      if (headerSecret !== secret && bearer !== secret) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const lockRows = await prisma.$queryRaw`SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked`;
    const locked = Boolean(lockRows?.[0]?.locked);
    if (!locked) {
      return res.status(200).json({ success: true, skipped: true, reason: 'locked' });
    }

    await processGlobalInactivityAutomation();
    res.status(200).json({ success: true, message: 'Inactivity automation processed' });
  } catch (error) {
    const requestId = String(req.headers['x-request-id'] || '').trim() || null;
    log({ level: 'error', msg: 'cron_inactivity_failed', requestId, error });
    reportError(error, { route: '/api/cron/inactivity', requestId });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    try {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
    } catch (error) {
      const requestId = String(req.headers['x-request-id'] || '').trim() || null;
      log({ level: 'warn', msg: 'cron_inactivity_unlock_failed', requestId, error });
    }
  }
};

export default handler;
