import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

const toNumber = (value) => {
  if (value && typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value || 0);
};

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: { msg: 'Method not supported' } });
    return;
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));

    const [totals, monthTotals, byProvider, providers] = await Promise.all([
      prisma.payment.aggregate({
        where: { deletedAt: null },
        _count: { id: true },
        _sum: { value: true, platformFee: true },
      }),
      prisma.payment.aggregate({
        where: { deletedAt: null, createdAt: { gte: startOfMonth } },
        _count: { id: true },
        _sum: { value: true, platformFee: true },
      }),
      prisma.payment.groupBy({
        by: ['providerId'],
        where: { deletedAt: null },
        _count: { id: true },
        _sum: { value: true, platformFee: true },
      }),
      prisma.paymentProvider.findMany({ select: { id: true, name: true, displayName: true } }),
    ]);

    const providerMap = new Map(providers.map((p) => [p.id, p]));
    const transactionsPerProvider = (byProvider || []).map((row) => {
      const p = providerMap.get(row.providerId) || null;
      return {
        providerId: row.providerId,
        provider: p ? { name: p.name, displayName: p.displayName } : null,
        count: row._count?.id || 0,
        volume: toNumber(row._sum?.value),
        revenue: toNumber(row._sum?.platformFee),
      };
    });

    res.status(200).json({
      data: {
        totalTransactionVolume: toNumber(totals?._sum?.value),
        platformRevenue: toNumber(totals?._sum?.platformFee),
        revenueThisMonth: toNumber(monthTotals?._sum?.platformFee),
        transactionsCount: totals?._count?.id || 0,
        transactionsThisMonth: monthTotals?._count?.id || 0,
        transactionsPerProvider,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Failed to fetch platform revenue' } });
  }
}

