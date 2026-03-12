import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

const ensureDefaults = async () => {
  const existing = await prisma.paymentProvider.findMany({ select: { id: true } });
  if (existing.length > 0) return;

  await prisma.paymentProvider.createMany({
    data: [
      { name: 'asaas', displayName: 'Asaas', status: 'active' },
      { name: 'stripe', displayName: 'Stripe', status: 'active' },
      { name: 'pagarme', displayName: 'Pagar.me', status: 'disabled' },
      { name: 'mercadopago', displayName: 'Mercado Pago', status: 'disabled' },
    ],
  });
};

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: { msg: 'Method not supported' } });
    return;
  }

  try {
    await ensureDefaults();

    const providers = await prisma.paymentProvider.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const credentials = await prisma.paymentProviderCredential.findMany({
      where: { providerId: { in: providers.map((p) => p.id) } },
      select: { providerId: true, environment: true, updatedAt: true },
    });

    const byProvider = new Map();
    for (const c of credentials) {
      const current = byProvider.get(c.providerId) || { sandbox: false, production: false, updatedAt: null };
      if (c.environment === 'sandbox') current.sandbox = true;
      if (c.environment === 'production') current.production = true;
      current.updatedAt = current.updatedAt ? new Date(Math.max(new Date(current.updatedAt).getTime(), new Date(c.updatedAt).getTime())) : c.updatedAt;
      byProvider.set(c.providerId, current);
    }

    res.status(200).json({
      data: {
        providers: providers.map((p) => ({
          ...p,
          credentials: byProvider.get(p.id) || { sandbox: false, production: false, updatedAt: null },
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Failed to fetch payment providers' } });
  }
}

