import prisma from '@/prisma/index';
import { getSession } from 'next-auth/react';
import { getNpsAnalytics } from '@/prisma/services/nps';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workspaceSlug } = req.query;

  try {
    // ── 1. Resolve workspace (only id needed) ──────────────────────────
    const workspace = await prisma.workspace.findFirst({
      where: { slug: workspaceSlug, deletedAt: null },
      select: { id: true },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspaceId = workspace.id;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // ── 2. Run ALL queries in parallel with Promise.all ────────────────
    const [
      contactsCount,
      openDealsCount,
      wonDealsResult,
      paymentsPaidResult,
      paymentsPendingResult,
      recentActivities,
      dealsLast6Months,
      upcomingTasks,
      npsAnalytics,
    ] = await Promise.all([
      // Total contacts
      prisma.contact.count({ where: { workspaceId } }),

      // Open deals (not in final stages)
      prisma.deal.count({
        where: {
          workspaceId,
          deletedAt: null,
          stage: { name: { notIn: ['Fechado', 'Perdido', 'Closed', 'Lost', 'Won'] } },
        },
      }),

      // Won deals count + revenue in one aggregate query
      prisma.deal.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          workspaceId,
          deletedAt: null,
          stage: { name: { in: ['Fechado', 'Closed', 'Won'] } },
        },
      }),

      prisma.payment.aggregate({
        _sum: { value: true },
        _count: { _all: true },
        where: {
          workspaceId,
          deletedAt: null,
          status: 'PAID',
        },
      }),

      prisma.payment.aggregate({
        _sum: { value: true },
        _count: { _all: true },
        where: {
          workspaceId,
          deletedAt: null,
          status: 'PENDING',
        },
      }),

      // Recent activities — slim select
      prisma.activity.findMany({
        where: { workspaceId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          title: true,
          createdAt: true,
          user: { select: { name: true, image: true } },
          deal: { select: { name: true } },
          contact: { select: { name: true } },
        },
      }),

      // Deals last 6 months — only what we need for the chart
      prisma.deal.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          createdAt: { gte: sixMonthsAgo },
        },
        select: {
          createdAt: true,
          amount: true,
          stage: { select: { name: true } },
        },
      }),

      // Upcoming tasks for the current user — slim select
      prisma.task.findMany({
        where: {
          workspaceId,
          assigneeId: session.user.userId,
          isCompleted: false,
          dueDate: { gte: new Date() },
        },
        take: 5,
        orderBy: { dueDate: 'asc' },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          contact: { select: { name: true } },
          deal: { select: { name: true } },
        },
      }),

      getNpsAnalytics(workspaceId, { from: sixMonthsAgo }),
    ]);

    // ── 3. Process deals chart in JS (already fetched) ─────────────────
    const salesByMonth = {};
    dealsLast6Months.forEach((deal) => {
      const month = deal.createdAt.toLocaleString('default', { month: 'short' });
      if (!salesByMonth[month]) {
        salesByMonth[month] = { name: month, value: 0 };
      }
      const stageName = (deal.stage?.name || '').toLowerCase();
      if (stageName === 'fechado' || stageName === 'closed' || stageName === 'won') {
        salesByMonth[month].value += Number(deal.amount) || 0;
      }
    });

    res.status(200).json({
      stats: {
        contacts: contactsCount,
        openDeals: openDealsCount,
        wonDeals: wonDealsResult._count._all,
        revenue: Number(wonDealsResult._sum.amount) || 0,
        paymentsPaid: paymentsPaidResult._count._all,
        paymentsPaidAmount: Number(paymentsPaidResult._sum.value) || 0,
        paymentsPending: paymentsPendingResult._count._all,
        paymentsPendingAmount: Number(paymentsPendingResult._sum.value) || 0,
        npsScore: npsAnalytics?.nps_score ?? 0,
        npsResponses: npsAnalytics?.total_responses ?? 0,
      },
      nps: npsAnalytics || null,
      recentActivities,
      salesData: Object.values(salesByMonth),
      upcomingTasks,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default handler;
