import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

const normalizeEnv = (value) => {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'production' || v === 'prod') return 'production';
  return 'sandbox';
};

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const providerId = req.query?.providerId;
  if (!providerId) {
    res.status(400).json({ error: { msg: 'providerId is required' } });
    return;
  }

  if (req.method !== 'PUT') {
    res.status(405).json({ error: { msg: 'Method not supported' } });
    return;
  }

  try {
    const { environment, apiKey, apiSecret, webhookSecret } = req.body || {};
    const env = normalizeEnv(environment);

    if (!apiKey || typeof apiKey !== 'string') {
      res.status(400).json({ error: { msg: 'apiKey is required' } });
      return;
    }

    await prisma.paymentProviderCredential.upsert({
      where: { providerId_environment: { providerId: String(providerId), environment: env } },
      update: {
        apiKey: apiKey.trim(),
        apiSecret: apiSecret ? String(apiSecret) : null,
        webhookSecret: webhookSecret ? String(webhookSecret) : null,
      },
      create: {
        providerId: String(providerId),
        environment: env,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret ? String(apiSecret) : null,
        webhookSecret: webhookSecret ? String(webhookSecret) : null,
      },
    });

    res.status(200).json({ data: { saved: true } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Failed to save credentials' } });
  }
}

