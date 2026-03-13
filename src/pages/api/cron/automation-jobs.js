import { processDueAutomationJobs } from '@/prisma/services/automation';
import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const lockKey = 'cron:automation-jobs';
  if (process.env.NODE_ENV === 'production') {
    const secret = await getSystemConfig('CRON_SECRET', process.env.CRON_SECRET);
    if (!secret) {
      return res.status(500).json({ error: 'CRON_SECRET not configured' });
    }
    if (req.headers['x-cron-secret'] !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const lockRows = await prisma.$queryRaw`SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked`;
    const locked = Boolean(lockRows?.[0]?.locked);
    if (!locked) {
      return res.status(200).json({ success: true, skipped: true, reason: 'locked' });
    }

    const result = await processDueAutomationJobs();
    return res.status(200).json({ success: true, result });
  } catch (error) {
    log({ level: 'error', msg: 'cron_automation_jobs_failed', requestId, error });
    reportError(error, { route: '/api/cron/automation-jobs', requestId });
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    try {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
    } catch (error) {
      log({ level: 'warn', msg: 'cron_automation_jobs_unlock_failed', requestId, error });
    }
  }
};

export default handler;
