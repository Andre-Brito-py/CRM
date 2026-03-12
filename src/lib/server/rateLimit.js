const buckets = new Map();

const getKey = ({ req, key }) => {
  if (key) return String(key);
  const ip =
    req.headers['x-forwarded-for']?.split(',')?.[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';
  return String(ip);
};

export const rateLimit = ({ req, limit = 60, windowMs = 60_000, key }) => {
  const now = Date.now();
  const bucketKey = getKey({ req, key });
  const current = buckets.get(bucketKey) || { count: 0, resetAt: now + windowMs };

  if (now > current.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  buckets.set(bucketKey, current);
  return { ok: true, remaining: limit - current.count, resetAt: current.resetAt };
};

