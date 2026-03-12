import { getSystemConfig } from '@/lib/server/config';

const ALLOWED_KEYS = new Set([
  'STRIPE_PUBLISHABLE_KEY',
  'GOOGLE_ANALYTICS_ID',
  'VAPID_PUBLIC_KEY',
  'VERCEL_IP_ADDRESS',
]);

const parseKeys = (value) => {
  if (!value) return null;
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  return raw
    .split(',')
    .map((k) => k.trim().toUpperCase())
    .filter(Boolean);
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: { msg: 'Method not allowed' } });
    return;
  }

  const requested = parseKeys(req.query?.keys);
  const keys = requested && requested.length > 0
    ? requested.filter((k) => ALLOWED_KEYS.has(k))
    : Array.from(ALLOWED_KEYS.values());

  const envFallbackByKey = {
    STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
    GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
    VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VERCEL_IP_ADDRESS: process.env.NEXT_PUBLIC_VERCEL_IP_ADDRESS,
  };

  const config = {};
  for (const key of keys) {
    const fallback = envFallbackByKey[key] || null;
    const value = await getSystemConfig(key, fallback);
    if (value) config[key] = value;
  }

  res.status(200).json({ data: { config } });
}
