import prisma from '@/prisma/index';
import { getSession } from 'next-auth/react';
import { getNpsAnalytics } from '@/prisma/services/nps';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import { getWorkspaceLimits } from '@/lib/server/subscription';
import { getSystemConfig } from '@/lib/server/config';

const parseUnitCost = (raw) => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
};

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
    const workspace = await getWorkspace(session.user.userId || session.user.id, session.user.email, workspaceSlug);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or permission denied' });
    }

    const isOwner = isWorkspaceOwner(session.user.email, workspace);
    const workspaceId = workspace.id;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const limits = isOwner ? await getWorkspaceLimits(workspaceId) : null;
    const plan = limits?.plan || null;

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
      membersAcceptedCount,
      membersPendingCount,
      webhooksActiveCount,
      automationRulesActiveCount,
      whatsappIntegrationsCount,
      whatsappOutbound30d,
      whatsappInbound30d,
      aiRequestsAgg,
      uploadRequestsAgg,
      unitCostWhatsAppOutboundRaw,
      unitCostAiRequestRaw,
      unitCostUploadRequestRaw,
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

      isOwner
        ? prisma.payment.aggregate({
          _sum: { value: true },
          _count: { _all: true },
          where: {
            workspaceId,
            deletedAt: null,
            status: 'PAID',
          },
        })
        : Promise.resolve({ _sum: { value: 0 }, _count: { _all: 0 } }),

      isOwner
        ? prisma.payment.aggregate({
          _sum: { value: true },
          _count: { _all: true },
          where: {
            workspaceId,
            deletedAt: null,
            status: 'PENDING',
          },
        })
        : Promise.resolve({ _sum: { value: 0 }, _count: { _all: 0 } }),

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
      isOwner
        ? prisma.deal.findMany({
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
        })
        : Promise.resolve([]),

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

      isOwner
        ? prisma.member.count({
          where: {
            workspaceId,
            deletedAt: null,
            status: 'ACCEPTED',
          },
        })
        : Promise.resolve(0),

      isOwner
        ? prisma.member.count({
          where: {
            workspaceId,
            deletedAt: null,
            status: 'PENDING',
          },
        })
        : Promise.resolve(0),

      isOwner
        ? prisma.webhook.count({
          where: {
            workspaceId,
            deletedAt: null,
            isActive: true,
          },
        })
        : Promise.resolve(0),

      isOwner
        ? prisma.automationRule.count({
          where: {
            workspaceId,
            deletedAt: null,
            isActive: true,
          },
        })
        : Promise.resolve(0),

      isOwner
        ? prisma.integration.count({
          where: {
            workspaceId,
            provider: 'WHATSAPP',
            enabled: true,
          },
        })
        : Promise.resolve(0),

      isOwner
        ? prisma.message.count({
          where: {
            deletedAt: null,
            direction: 'OUTBOUND',
            createdAt: { gte: thirtyDaysAgo },
            conversation: { workspaceId, deletedAt: null, platform: 'WHATSAPP' },
          },
        })
        : Promise.resolve(0),

      isOwner
        ? prisma.message.count({
          where: {
            deletedAt: null,
            direction: 'INBOUND',
            createdAt: { gte: thirtyDaysAgo },
            conversation: { workspaceId, deletedAt: null, platform: 'WHATSAPP' },
          },
        })
        : Promise.resolve(0),

      isOwner
        ? prisma.rateLimitCounter.aggregate({
          _sum: { count: true },
          where: {
            key: {
              startsWith: `w:${workspaceId}:ai:`,
              endsWith: ':day',
            },
            resetAt: { gt: new Date() },
          },
        })
        : Promise.resolve({ _sum: { count: 0 } }),

      isOwner
        ? prisma.rateLimitCounter.aggregate({
          _sum: { count: true },
          where: {
            key: {
              startsWith: `w:${workspaceId}:upload:`,
              endsWith: ':day',
            },
            resetAt: { gt: new Date() },
          },
        })
        : Promise.resolve({ _sum: { count: 0 } }),

      isOwner
        ? getSystemConfig('FINOPS_UNIT_COST_WHATSAPP_OUTBOUND', process.env.FINOPS_UNIT_COST_WHATSAPP_OUTBOUND || '0')
        : Promise.resolve('0'),
      isOwner
        ? getSystemConfig('FINOPS_UNIT_COST_AI_REQUEST', process.env.FINOPS_UNIT_COST_AI_REQUEST || '0')
        : Promise.resolve('0'),
      isOwner
        ? getSystemConfig('FINOPS_UNIT_COST_UPLOAD_REQUEST', process.env.FINOPS_UNIT_COST_UPLOAD_REQUEST || '0')
        : Promise.resolve('0'),
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

    const aiRequests24h = Number(aiRequestsAgg?._sum?.count) || 0;
    const uploadRequests24h = Number(uploadRequestsAgg?._sum?.count) || 0;
    const unitCostWhatsAppOutbound = parseUnitCost(unitCostWhatsAppOutboundRaw);
    const unitCostAiRequest = parseUnitCost(unitCostAiRequestRaw);
    const unitCostUploadRequest = parseUnitCost(unitCostUploadRequestRaw);

    const stats = {
      contacts: contactsCount,
      openDeals: openDealsCount,
      wonDeals: wonDealsResult._count._all,
      npsScore: npsAnalytics?.nps_score ?? 0,
      npsResponses: npsAnalytics?.total_responses ?? 0,
    };

    if (isOwner) {
      stats.revenue = Number(wonDealsResult._sum.amount) || 0;
      stats.paymentsPaid = paymentsPaidResult._count._all;
      stats.paymentsPaidAmount = Number(paymentsPaidResult._sum.value) || 0;
      stats.paymentsPending = paymentsPendingResult._count._all;
      stats.paymentsPendingAmount = Number(paymentsPendingResult._sum.value) || 0;
      stats.averageTicket = stats.paymentsPaid > 0 ? stats.paymentsPaidAmount / stats.paymentsPaid : 0;
    }

    res.status(200).json({
      permissions: { isOwner },
      stats,
      usage: isOwner
        ? {
          plan,
          limits,
          counts: {
            membersAccepted: membersAcceptedCount,
            membersPending: membersPendingCount,
            webhooksActive: webhooksActiveCount,
            automationsActive: automationRulesActiveCount,
            whatsappIntegrations: whatsappIntegrationsCount,
            whatsappOutbound30d,
            whatsappInbound30d,
            aiRequests24h,
            uploadRequests24h,
          },
          unitCosts: {
            whatsappOutbound: unitCostWhatsAppOutbound,
            aiRequest: unitCostAiRequest,
            uploadRequest: unitCostUploadRequest,
          },
          estimatedCosts: {
            whatsappOutbound30d: whatsappOutbound30d * unitCostWhatsAppOutbound,
            aiRequests24h: aiRequests24h * unitCostAiRequest,
            uploadRequests24h: uploadRequests24h * unitCostUploadRequest,
          },
        }
        : null,
      nps: npsAnalytics || null,
      recentActivities,
      salesData: isOwner ? Object.values(salesByMonth) : [],
      upcomingTasks,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default handler;
