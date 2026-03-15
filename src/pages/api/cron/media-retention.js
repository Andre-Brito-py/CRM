import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';

const parseNumber = (value, fallback) => {
  const raw = String(value ?? '').trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const handler = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const lockKey = 'cron:media-retention';

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

    const daysRaw = await getSystemConfig('MEDIA_RETENTION_DAYS', '30');
    const days = Math.max(0, Math.floor(parseNumber(daysRaw, 30)));
    const batchRaw = await getSystemConfig('MEDIA_RETENTION_BATCH', '1000');
    const batch = Math.max(50, Math.min(5000, Math.floor(parseNumber(batchRaw, 1000))));

    if (days === 0) {
      return res.status(200).json({ success: true, result: { skipped: true, reason: 'disabled' } });
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60_000);

    const updatedRows = await prisma.$queryRaw`
      WITH targets AS (
        SELECT "id"
        FROM "messages"
        WHERE "mediaUrl" IS NOT NULL
          AND "createdAt" IS NOT NULL
          AND "createdAt" < ${cutoff}
        ORDER BY "createdAt" ASC
        LIMIT ${batch}
      )
      UPDATE "messages"
      SET "mediaUrl" = NULL, "updatedAt" = NOW()
      WHERE "id" IN (SELECT "id" FROM targets)
      RETURNING "id"
    `;

    const count = Array.isArray(updatedRows) ? updatedRows.length : 0;
    return res.status(200).json({ success: true, result: { days, cutoff: cutoff.toISOString(), batch, cleared: count } });
  } catch (error) {
    log({ level: 'error', msg: 'cron_media_retention_failed', requestId, error });
    reportError(error, { route: '/api/cron/media-retention', requestId });
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    try {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
    } catch (error) {
      log({ level: 'warn', msg: 'cron_media_retention_unlock_failed', requestId, error });
    }
  }
};

export default handler;
