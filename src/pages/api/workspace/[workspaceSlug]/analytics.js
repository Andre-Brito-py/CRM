import prisma from '@/prisma/index';
import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';

const WON_STAGE_NAMES_LOWER = ['fechado', 'closed', 'won'];

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not supported' });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workspaceSlug } = req.query;
  const scope = req.query.scope;

  try {
    const workspace = await getWorkspace(session.user.userId || session.user.id, session.user.email, workspaceSlug);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or permission denied' });
    }

    const workspaceId = workspace.id;

    // ── WhatsApp scope: single focused query ─────────────────────────
    if (scope === 'whatsapp') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const messages = await prisma.message.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          conversation: { workspaceId, platform: 'WHATSAPP' },
        },
        select: { createdAt: true, direction: true },
      });

      const map = new Map();
      const start = new Date(thirtyDaysAgo);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      const days = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        map.set(key, { date: key, inbound: 0, outbound: 0, total: 0 });
        days.push(key);
      }

      messages.forEach((m) => {
        if (!m.createdAt) return;
        const key = new Date(m.createdAt).toISOString().slice(0, 10);
        const entry = map.get(key);
        if (!entry) return;
        const dir = (m.direction || '').toUpperCase();
        if (dir === 'INBOUND') entry.inbound += 1;
        if (dir === 'OUTBOUND') entry.outbound += 1;
        entry.total += 1;
      });

      const messageTrend = days.map((d) => map.get(d));
      const messageTotals = messageTrend.reduce(
        (acc, cur) => ({
          inbound: acc.inbound + cur.inbound,
          outbound: acc.outbound + cur.outbound,
          total: acc.total + cur.total,
        }),
        { inbound: 0, outbound: 0, total: 0 }
      );

      return res.status(200).json({ messageTrend, messageTotals });
    }

    // ── Full analytics scope: ALL queries in parallel ─────────────────
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const wonStageNames = ['Fechado', 'Closed', 'Won'];

    const [
      salesByUser,
      dealsByStage,
      tasksByAssignee,
      salesTrendRows,
      sourceRows,
      avgClosingRows,
    ] = await Promise.all([
      // 1. Sales by assignee (won deals)
      prisma.deal.groupBy({
        by: ['assigneeId'],
        where: { workspaceId, deletedAt: null, stage: { name: { in: wonStageNames } } },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // 2. Deals by stage (funnel)
      prisma.deal.groupBy({
        by: ['stageId'],
        where: { workspaceId, deletedAt: null },
        _count: { id: true },
        _sum: { amount: true },
      }),

      // 3. Tasks by assignee (completion stats)
      prisma.task.groupBy({
        by: ['assigneeId', 'isCompleted'],
        where: { workspaceId, deletedAt: null },
        _count: { id: true },
      }),

      // 4. Sales trend (aggregated in DB)
      prisma.$queryRaw`
        SELECT
          date_trunc('month', COALESCE(d."closeDate", d."createdAt")) AS month,
          COALESCE(SUM(d."amount"), 0) AS amount
        FROM "deals" d
        JOIN "stages" s ON s."id" = d."stageId"
        WHERE
          d."workspaceId" = ${workspaceId}
          AND d."deletedAt" IS NULL
          AND lower(s."name") IN (${WON_STAGE_NAMES_LOWER[0]}, ${WON_STAGE_NAMES_LOWER[1]}, ${WON_STAGE_NAMES_LOWER[2]})
          AND (d."closeDate" >= ${oneYearAgo} OR d."createdAt" >= ${oneYearAgo})
        GROUP BY 1
        ORDER BY 1 ASC
      `,

      // 5. Deals by source (JSON extraction)
      prisma.$queryRaw`
        SELECT
          COALESCE(NULLIF(d."customFields"->>'source', ''), 'Direct') AS source,
          COUNT(*)::int AS count,
          COALESCE(SUM(d."amount"), 0) AS amount
        FROM "deals" d
        WHERE
          d."workspaceId" = ${workspaceId}
          AND d."deletedAt" IS NULL
        GROUP BY 1
        ORDER BY 3 DESC
      `,

      // 6. Avg closing time (days) in DB
      prisma.$queryRaw`
        SELECT
          AVG(EXTRACT(EPOCH FROM (d."closeDate" - d."createdAt")) / 86400.0) AS avg_days
        FROM "deals" d
        JOIN "stages" s ON s."id" = d."stageId"
        WHERE
          d."workspaceId" = ${workspaceId}
          AND d."deletedAt" IS NULL
          AND d."closeDate" IS NOT NULL
          AND d."createdAt" IS NOT NULL
          AND lower(s."name") IN (${WON_STAGE_NAMES_LOWER[0]}, ${WON_STAGE_NAMES_LOWER[1]}, ${WON_STAGE_NAMES_LOWER[2]})
      `,
    ]);

    // ── Enrich user data in ONE batch query ───────────────────────────
    const userIds = [
      ...salesByUser.map((s) => s.assigneeId),
      ...tasksByAssignee.map((t) => t.assigneeId),
    ].filter((id) => id !== null);
    const uniqueUserIds = [...new Set(userIds)];

    const [users, stages] = await Promise.all([
      uniqueUserIds.length > 0
        ? prisma.user.findMany({
          where: { id: { in: uniqueUserIds } },
          select: { id: true, name: true, image: true },
        })
        : Promise.resolve([]),
      dealsByStage.length > 0
        ? prisma.stage.findMany({
          where: { id: { in: dealsByStage.map((s) => s.stageId) } },
          select: { id: true, name: true, order: true },
        })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));

    // ── Transform results ─────────────────────────────────────────────

    const salesByUserWithDetails = salesByUser
      .map((s) => ({
        user: userMap.get(s.assigneeId) || { name: 'Unassigned', image: null },
        amount: Number(s._sum.amount) || 0,
        count: s._count.id || 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const funnelData = stages
      .map((stage) => {
        const data = dealsByStage.find((d) => d.stageId === stage.id);
        return {
          stage: stage.name,
          order: stage.order,
          count: data?._count.id || 0,
          amount: Number(data?._sum.amount) || 0,
        };
      })
      .sort((a, b) => a.order - b.order);

    const salesTrend = (salesTrendRows || [])
      .map((r) => {
        const d = r?.month ? new Date(r.month) : null;
        const month = d ? d.toLocaleString('default', { month: 'short', year: 'numeric' }) : '';
        return { month, amount: Number(r?.amount) || 0, sortDate: d ? d.getTime() : 0 };
      })
      .filter((r) => r.month)
      .sort((a, b) => a.sortDate - b.sortDate)
      .map(({ month, amount }) => ({ month, amount }));

    const taskStats = {};
    tasksByAssignee.forEach((item) => {
      const key = item.assigneeId || 'unassigned';
      if (!taskStats[key]) taskStats[key] = { total: 0, completed: 0 };
      taskStats[key].total += item._count.id;
      if (item.isCompleted) taskStats[key].completed += item._count.id;
    });
    const taskCompletionData = Object.keys(taskStats)
      .map((aid) => {
        const stats = taskStats[aid];
        return {
          user: userMap.get(aid) || { name: 'Unassigned', image: null },
          total: stats.total,
          completed: stats.completed,
          rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.completed - a.completed);

    const sourceData = (sourceRows || [])
      .map((r) => ({
        source: r?.source || 'Direct',
        count: Number(r?.count) || 0,
        amount: Number(r?.amount) || 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const avgClosingTime = Math.round(Number(avgClosingRows?.[0]?.avg_days) || 0);

    res.status(200).json({
      salesByUser: salesByUserWithDetails,
      funnelData,
      salesTrend,
      taskCompletionData,
      sourceData,
      avgClosingTime,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ error: 'Unable to fetch analytics' });
  }
};

export default handler;
