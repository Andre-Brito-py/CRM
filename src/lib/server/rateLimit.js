import prisma from '@/prisma/index';

const getKey = ({ req, key }) => {
  if (key) return String(key);
  const ip =
    req.headers['x-forwarded-for']?.split(',')?.[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';
  return String(ip);
};

const buckets = new Map();

const rateLimitMemory = ({ req, limit = 60, windowMs = 60_000, key }) => {
  const nowMs = Date.now();
  const bucketKey = getKey({ req, key });
  const current = buckets.get(bucketKey) || { count: 0, resetAt: nowMs + windowMs };

  if (nowMs > current.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: nowMs + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: nowMs + windowMs };
  }

  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  buckets.set(bucketKey, current);
  return { ok: true, remaining: limit - current.count, resetAt: current.resetAt };
};

const rateLimitPostgres = async ({ req, limit = 60, windowMs = 60_000, key }) => {
  const bucketKey = getKey({ req, key });
  const resetAt = new Date(Date.now() + windowMs);

  const rows = await prisma.$queryRaw`
    INSERT INTO "rate_limit_counters" ("key", "count", "resetAt", "createdAt", "updatedAt")
    VALUES (${bucketKey}, 1, ${resetAt}, NOW(), NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limit_counters"."resetAt" <= NOW() THEN 1 ELSE "rate_limit_counters"."count" + 1 END,
      "resetAt" = CASE WHEN "rate_limit_counters"."resetAt" <= NOW() THEN EXCLUDED."resetAt" ELSE "rate_limit_counters"."resetAt" END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt"
  `;

  const row = Array.isArray(rows) ? rows[0] : rows;
  const count = Number(row?.count || 0);
  const resetAtMs = new Date(row?.resetAt).getTime();
  const remaining = Math.max(0, limit - count);

  return { ok: count <= limit, remaining, resetAt: resetAtMs };
};

export const rateLimit = async ({ req, limit = 60, windowMs = 60_000, key }) => {
  const store = String(process.env.RATE_LIMIT_STORE || 'postgres').trim().toLowerCase();
  if (store !== 'postgres') {
    return rateLimitMemory({ req, limit, windowMs, key });
  }

  try {
    return await rateLimitPostgres({ req, limit, windowMs, key });
  } catch {
    return rateLimitMemory({ req, limit, windowMs, key });
  }
};
