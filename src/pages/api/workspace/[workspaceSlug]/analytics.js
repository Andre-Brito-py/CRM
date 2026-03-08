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

      // 1. Sales by User (Won Deals)
      // Group deals by userId and sum amount where stage is 'Fechado'
      const salesByUser = await prisma.deal.groupBy({
        by: ['userId'],
        where: {
          workspaceId: workspace.id,
          stage: { name: 'Fechado' }
        },
        _sum: { amount: true },
        _count: { id: true }
      });

      // Enrich with user details
      const userIds = salesByUser
        .map(s => s.userId)
        .filter(id => id !== null);

      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, image: true }
      });

      const salesByUserWithDetails = salesByUser.map(s => {
        const user = users.find(u => u.id === s.userId);
        return {
          user: user || { name: 'Unassigned', image: null },
          amount: Number(s._sum.amount) || 0,
          count: s._count.id || 0
        };
      }).sort((a, b) => b.amount - a.amount); // Sort by amount desc

      // 2. Deals by Stage (Pipeline Funnel)
      const dealsByStage = await prisma.deal.groupBy({
        by: ['stageId'],
        where: { workspaceId: workspace.id },
        _count: { id: true },
        _sum: { amount: true }
      });

      // Enrich with stage names
      const stageIds = dealsByStage.map(s => s.stageId);
      const stages = await prisma.stage.findMany({
        where: { id: { in: stageIds } },
        select: { id: true, name: true, order: true }
      });

      const funnelData = stages.map(stage => {
        const data = dealsByStage.find(d => d.stageId === stage.id);
        return {
          stage: stage.name,
          order: stage.order,
          count: data?._count.id || 0,
          amount: Number(data?._sum.amount) || 0
        };
      }).sort((a, b) => a.order - b.order);

      // 3. Sales over time (Last 12 months)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const wonDeals = await prisma.deal.findMany({
        where: {
          workspaceId: workspace.id,
          stage: { name: 'Fechado' },
          OR: [
            { closeDate: { gte: oneYearAgo } },
            { createdAt: { gte: oneYearAgo } }
          ]
        },
        select: { closeDate: true, createdAt: true, amount: true }
      });

      const salesMap = new Map();
      wonDeals.forEach(deal => {
        const date = deal.closeDate || deal.createdAt;
        const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        // Use first day of month for sorting
        const sortDate = new Date(date.getFullYear(), date.getMonth(), 1).getTime();

        if (!salesMap.has(key)) {
          salesMap.set(key, { amount: 0, sortDate });
        }
        const entry = salesMap.get(key);
        entry.amount += Number(deal.amount) || 0;
      });

      const salesTrend = Array.from(salesMap.entries())
        .map(([month, data]) => ({
          month,
          amount: data.amount,
          sortDate: data.sortDate
        }))
        .sort((a, b) => a.sortDate - b.sortDate)
        .map(({ month, amount }) => ({ month, amount }));

      // 4. Task Completion by User
      const tasksByAssignee = await prisma.task.groupBy({
        by: ['assigneeId', 'isCompleted'],
        where: { workspaceId: workspace.id },
        _count: { id: true }
      });

      // Process task data
      const taskStats = {};
      tasksByAssignee.forEach(item => {
        const assigneeId = item.assigneeId || 'unassigned';
        if (!taskStats[assigneeId]) {
          taskStats[assigneeId] = { total: 0, completed: 0 };
        }
        taskStats[assigneeId].total += item._count.id;
        if (item.isCompleted) {
          taskStats[assigneeId].completed += item._count.id;
        }
      });

      // Enrich with user details for tasks
      const taskUserIds = Object.keys(taskStats).filter(id => id !== 'unassigned');
      const taskUsers = await prisma.user.findMany({
        where: { id: { in: taskUserIds } },
        select: { id: true, name: true, image: true }
      });

      const taskCompletionData = Object.keys(taskStats).map(assigneeId => {
        const user = taskUsers.find(u => u.id === assigneeId);
        const stats = taskStats[assigneeId];
        return {
          user: user || { name: 'Unassigned', image: null },
          total: stats.total,
          completed: stats.completed,
          rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
        };
      }).sort((a, b) => b.completed - a.completed);

      // 5. Deals by Source
      const dealsBySource = await prisma.deal.groupBy({
        by: ['source'],
        where: { workspaceId: workspace.id },
        _count: { id: true },
        _sum: { amount: true }
      });

      const sourceData = dealsBySource.map(d => ({
        source: d.source || 'Direct',
        count: d._count.id,
        amount: Number(d._sum.amount) || 0
      })).sort((a, b) => b.amount - a.amount);

      // 6. Average Closing Time
      const closedDeals = await prisma.deal.findMany({
        where: {
          workspaceId: workspace.id,
          stage: { name: 'Fechado' },
          closeDate: { not: null },
          createdAt: { not: null }
        },
        select: { createdAt: true, closeDate: true }
      });

      let totalDuration = 0;
      closedDeals.forEach(deal => {
        const start = new Date(deal.createdAt).getTime();
        const end = new Date(deal.closeDate).getTime();
        // Ensure valid dates
        if (!isNaN(start) && !isNaN(end) && end >= start) {
            const diff = end - start;
            totalDuration += diff;
        }
      });

      const avgClosingTime = closedDeals.length > 0
        ? Math.round((totalDuration / closedDeals.length) / (1000 * 60 * 60 * 24)) // in days
        : 0;

      res.status(200).json({ 
        salesByUser: salesByUserWithDetails, 
        funnelData, 
        salesTrend, 
        taskCompletionData,
        sourceData,
        avgClosingTime
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to fetch analytics' });
    }
  } else {
    res.status(405).json({ error: 'Method not supported' });
  }
};

export default handler;
