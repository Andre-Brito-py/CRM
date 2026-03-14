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

const normalizeIncrement = (increment) => {
  const n = Number(increment);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
};

const rateLimitMemory = ({ req, limit = 60, windowMs = 60_000, key, increment = 1 }) => {
  const nowMs = Date.now();
  const bucketKey = getKey({ req, key });
  const inc = normalizeIncrement(increment);
  const current = buckets.get(bucketKey) || { count: 0, resetAt: nowMs + windowMs };

  if (nowMs > current.resetAt) {
    buckets.set(bucketKey, { count: inc, resetAt: nowMs + windowMs });
    return { ok: inc <= limit, remaining: Math.max(0, limit - inc), resetAt: nowMs + windowMs };
  }

  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += inc;
  buckets.set(bucketKey, current);
  return { ok: true, remaining: limit - current.count, resetAt: current.resetAt };
};

const rateLimitPostgres = async ({ req, limit = 60, windowMs = 60_000, key, increment = 1 }) => {
  const bucketKey = getKey({ req, key });
  const resetAt = new Date(Date.now() + windowMs);
  const inc = normalizeIncrement(increment);

  const rows = await prisma.$queryRaw`
    INSERT INTO "rate_limit_counters" ("key", "count", "resetAt", "createdAt", "updatedAt")
    VALUES (${bucketKey}, ${inc}, ${resetAt}, NOW(), NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limit_counters"."resetAt" <= NOW() THEN ${inc} ELSE "rate_limit_counters"."count" + ${inc} END,
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

export const rateLimit = async ({ req, limit = 60, windowMs = 60_000, key, increment = 1 }) => {
  const store = String(process.env.RATE_LIMIT_STORE || 'postgres').trim().toLowerCase();
  if (store !== 'postgres') {
    return rateLimitMemory({ req, limit, windowMs, key, increment });
  }

  try {
    return await rateLimitPostgres({ req, limit, windowMs, key, increment });
  } catch {
    return rateLimitMemory({ req, limit, windowMs, key, increment });
  }
};
