import { getServerSession } from 'next-auth/next';
import prisma from '@/prisma/index';
import { authOptions } from '@/lib/server/auth';

const toNumber = (value) => {
  if (value && typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value || 0);
};

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
    const overdueWhere = {
      deletedAt: null,
      dueDate: { lt: now },
      status: { notIn: ['PAID', 'CANCELED'] },
    };

    const [payments, aggregate] = await Promise.all([
      prisma.payment.findMany({
        where: overdueWhere,
        select: {
          id: true,
          value: true,
          status: true,
          dueDate: true,
          description: true,
          invoiceUrl: true,
          paymentUrl: true,
          asaasPaymentId: true,
          createdAt: true,
          workspace: { select: { id: true, name: true, slug: true } },
          contact: { select: { id: true, name: true, email: true, phone: true } },
          deal: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 250,
      }),
      prisma.payment.aggregate({
        where: overdueWhere,
        _count: { id: true },
        _sum: { value: true },
      }),
    ]);

    res.status(200).json({
      data: {
        summary: {
          count: aggregate?._count?.id || 0,
          totalValue: toNumber(aggregate?._sum?.value),
        },
        payments: payments.map((p) => ({
          ...p,
          value: toNumber(p.value),
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Failed to fetch overdue payments' } });
  }
}
