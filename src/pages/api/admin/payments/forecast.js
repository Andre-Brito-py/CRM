import { getServerSession } from 'next-auth/next';
import prisma from '@/prisma/index';
import { authOptions } from '@/lib/server/auth';

const toNumber = (value) => {
  if (value && typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value || 0);
};

const dayKey = (date) => date.toISOString().slice(0, 10);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: { msg: 'Method not supported' } });
    return;
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  if (session?.user?.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  try {
    const now = new Date();
    const days = Math.min(Math.max(Number(req.query?.days || 30), 1), 365);
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const end = new Date(now);
    end.setDate(end.getDate() + days);

    const upcomingWhere = {
      deletedAt: null,
      dueDate: { gte: now, lte: end },
      status: { notIn: ['PAID', 'CANCELED'] },
    };

    const overdueWhere = {
      deletedAt: null,
      dueDate: { lt: now },
      status: { notIn: ['PAID', 'CANCELED'] },
    };

    const paidLast30Where = {
      deletedAt: null,
      status: 'PAID',
      updatedAt: { gte: start, lte: now },
    };

    const [upcomingPayments, upcomingAgg, overdueAgg, paidAgg] = await Promise.all([
      prisma.payment.findMany({
        where: upcomingWhere,
        select: {
          id: true,
          value: true,
          dueDate: true,
          status: true,
          workspace: { select: { id: true, name: true, slug: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 2000,
      }),
      prisma.payment.aggregate({ where: upcomingWhere, _count: { id: true }, _sum: { value: true } }),
      prisma.payment.aggregate({ where: overdueWhere, _count: { id: true }, _sum: { value: true } }),
      prisma.payment.aggregate({ where: paidLast30Where, _count: { id: true }, _sum: { value: true } }),
    ]);

    const buckets = new Map();
    for (const payment of upcomingPayments) {
      if (!payment?.dueDate) continue;
      const key = dayKey(payment.dueDate);
      const current = buckets.get(key) || { date: key, total: 0, count: 0 };
      current.total += toNumber(payment.value);
      current.count += 1;
      buckets.set(key, current);
    }

    const series = [];
    const cursor = new Date(now);
    cursor.setHours(0, 0, 0, 0);
    const endCursor = new Date(end);
    endCursor.setHours(0, 0, 0, 0);

    for (let d = new Date(cursor); d <= endCursor; d.setDate(d.getDate() + 1)) {
      const key = dayKey(d);
      series.push(buckets.get(key) || { date: key, total: 0, count: 0 });
    }

    res.status(200).json({
      data: {
        summary: {
          upcomingDays: days,
          upcomingCount: upcomingAgg?._count?.id || 0,
          upcomingTotal: toNumber(upcomingAgg?._sum?.value),
          overdueCount: overdueAgg?._count?.id || 0,
          overdueTotal: toNumber(overdueAgg?._sum?.value),
          paidLast30Count: paidAgg?._count?.id || 0,
          paidLast30Total: toNumber(paidAgg?._sum?.value),
        },
        series,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Failed to fetch forecast data' } });
  }
}
