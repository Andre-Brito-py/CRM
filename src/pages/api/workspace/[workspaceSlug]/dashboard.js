import prisma from '@/prisma/index';
import { getSession } from 'next-auth/react';

const handler = async (req, res) => {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workspaceSlug } = req.query;

  if (req.method === 'GET') {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: { slug: workspaceSlug },
        select: { id: true },
      });

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Counts
      const contactsCount = await prisma.contact.count({
        where: { workspaceId: workspace.id },
      });

      const openDealsCount = await prisma.deal.count({
        where: {
          workspaceId: workspace.id,
          stage: {
            name: {
              notIn: ['Fechado', 'Perdido'],
            },
          },
        },
      });

      const wonDealsCount = await prisma.deal.count({
        where: {
          workspaceId: workspace.id,
          stage: {
            name: 'Fechado',
          },
        },
      });

      // Revenue (Sum of amount for Won deals)
      const revenue = await prisma.deal.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          workspaceId: workspace.id,
          stage: {
            name: 'Fechado',
          },
        },
      });

      // Recent Activities
      const recentActivities = await prisma.activity.findMany({
        where: { workspaceId: workspace.id },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, image: true },
          },
          deal: {
            select: { name: true },
          },
          contact: {
            select: { name: true },
          },
        },
      });

      // Sales Performance (simplified: deals created per month for last 6 months)
      // Since grouping by date in Prisma is tricky across DBs without raw query,
      // we'll fetch last 6 months deals and process in JS.
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const dealsLast6Months = await prisma.deal.findMany({
        where: {
          workspaceId: workspace.id,
          createdAt: {
            gte: sixMonthsAgo,
          },
        },
        select: {
          createdAt: true,
          amount: true,
          stage: {
            select: { name: true },
          },
        },
      });

      // Upcoming Tasks for the current user
      const upcomingTasks = await prisma.task.findMany({
        where: {
          workspaceId: workspace.id,
          assigneeId: session.user.userId,
          isCompleted: false,
          dueDate: {
            gte: new Date(),
          },
        },
        take: 5,
        orderBy: {
          dueDate: 'asc',
        },
        include: {
          contact: {
            select: { name: true },
          },
          deal: {
            select: { name: true },
          },
        },
      });

      // Process deals for chart
      const salesByMonth = {};
      dealsLast6Months.forEach((deal) => {
        const month = deal.createdAt.toLocaleString('default', { month: 'short' });
        if (!salesByMonth[month]) {
          salesByMonth[month] = { name: month, value: 0 };
        }
        if (deal.stage.name === 'Fechado') {
          salesByMonth[month].value += Number(deal.amount) || 0;
        }
      });

      const salesData = Object.values(salesByMonth);

      res.status(200).json({
        stats: {
          contacts: contactsCount,
          openDeals: openDealsCount,
          wonDeals: wonDealsCount,
          revenue: revenue._sum.amount || 0,
        },
        recentActivities,
        salesData,
        upcomingTasks,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default handler;
