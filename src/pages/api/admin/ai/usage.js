import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';
import { Prisma } from '@prisma/client';

const parseDateOnly = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const startOfDayUtc = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

const addDaysUtc = (date, days) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const toInt = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
    const endParam = parseDateOnly(req.query.end);
    const startParam = parseDateOnly(req.query.start);
    const endAt = endParam ? addDaysUtc(startOfDayUtc(endParam), 1) : now;
    const startAt = startParam ? startOfDayUtc(startParam) : addDaysUtc(startOfDayUtc(now), -30);

    const workspaceId = req.query.workspaceId ? String(req.query.workspaceId) : null;
    const where = {
      createdAt: { gte: startAt, lt: endAt },
      ...(workspaceId ? { workspaceId } : {}),
    };

    const [totalsAgg, byDayRows, byWorkspaceRows, byRouteRows, byModelRows, billedByCurrencyRows] = await Promise.all([
      prisma.aiUsageEvent.aggregate({
        where,
        _count: { id: true },
        _sum: { tokensTotal: true, billedAmount: true },
      }),
      prisma.$queryRaw`
        SELECT
          date_trunc('day', a."createdAt") AS day,
          COALESCE(SUM(a."tokensTotal"), 0)::bigint AS tokens_total,
          COALESCE(SUM(COALESCE(a."billedAmount", 0)), 0)::bigint AS billed_amount,
          COUNT(*)::int AS events_count,
          COALESCE(SUM(CASE WHEN a."overageMode" THEN 1 ELSE 0 END), 0)::int AS overage_events
        FROM "ai_usage_events" a
        WHERE
          a."createdAt" >= ${startAt}
          AND a."createdAt" < ${endAt}
          ${workspaceId ? Prisma.sql`AND a."workspaceId" = ${workspaceId}` : Prisma.empty}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.$queryRaw`
        SELECT
          a."workspaceId" AS workspace_id,
          w."slug" AS workspace_slug,
          w."name" AS workspace_name,
          COALESCE(SUM(a."tokensTotal"), 0)::bigint AS tokens_total,
          COALESCE(SUM(COALESCE(a."billedAmount", 0)), 0)::bigint AS billed_amount,
          COUNT(*)::int AS events_count,
          COALESCE(SUM(CASE WHEN a."overageMode" THEN 1 ELSE 0 END), 0)::int AS overage_events
        FROM "ai_usage_events" a
        JOIN "workspaces" w ON w."id" = a."workspaceId"
        WHERE
          a."createdAt" >= ${startAt}
          AND a."createdAt" < ${endAt}
          ${workspaceId ? Prisma.sql`AND a."workspaceId" = ${workspaceId}` : Prisma.empty}
        GROUP BY 1, 2, 3
        ORDER BY tokens_total DESC
        LIMIT 15
      `,
      prisma.$queryRaw`
        SELECT
          a."route" AS route,
          COALESCE(SUM(a."tokensTotal"), 0)::bigint AS tokens_total,
          COUNT(*)::int AS events_count,
          COALESCE(SUM(CASE WHEN a."overageMode" THEN 1 ELSE 0 END), 0)::int AS overage_events
        FROM "ai_usage_events" a
        WHERE
          a."createdAt" >= ${startAt}
          AND a."createdAt" < ${endAt}
          ${workspaceId ? Prisma.sql`AND a."workspaceId" = ${workspaceId}` : Prisma.empty}
        GROUP BY 1
        ORDER BY tokens_total DESC
        LIMIT 15
      `,
      prisma.$queryRaw`
        SELECT
          COALESCE(NULLIF(a."model", ''), 'unknown') AS model,
          COALESCE(SUM(a."tokensTotal"), 0)::bigint AS tokens_total,
          COUNT(*)::int AS events_count,
          COALESCE(SUM(CASE WHEN a."overageMode" THEN 1 ELSE 0 END), 0)::int AS overage_events
        FROM "ai_usage_events" a
        WHERE
          a."createdAt" >= ${startAt}
          AND a."createdAt" < ${endAt}
          ${workspaceId ? Prisma.sql`AND a."workspaceId" = ${workspaceId}` : Prisma.empty}
        GROUP BY 1
        ORDER BY tokens_total DESC
        LIMIT 15
      `,
      prisma.$queryRaw`
        SELECT
          COALESCE(NULLIF(a."billedCurrency", ''), 'unknown') AS currency,
          COALESCE(SUM(a."billedAmount"), 0)::bigint AS billed_amount,
          COUNT(*)::int AS invoice_items
        FROM "ai_usage_events" a
        WHERE
          a."createdAt" >= ${startAt}
          AND a."createdAt" < ${endAt}
          AND a."billedAmount" IS NOT NULL
          ${workspaceId ? Prisma.sql`AND a."workspaceId" = ${workspaceId}` : Prisma.empty}
        GROUP BY 1
        ORDER BY billed_amount DESC
      `,
    ]);

    const totals = {
      events: totalsAgg?._count?.id || 0,
      tokens: toInt(totalsAgg?._sum?.tokensTotal),
      billedAmount: toInt(totalsAgg?._sum?.billedAmount),
    };

    const byDay = (byDayRows || []).map((r) => ({
      day: r?.day ? new Date(r.day).toISOString().slice(0, 10) : null,
      tokens: toInt(r?.tokens_total),
      billedAmount: toInt(r?.billed_amount),
      events: toInt(r?.events_count),
      overageEvents: toInt(r?.overage_events),
    }));

    const topWorkspaces = (byWorkspaceRows || []).map((r) => ({
      workspaceId: r?.workspace_id || null,
      slug: r?.workspace_slug || null,
      name: r?.workspace_name || null,
      tokens: toInt(r?.tokens_total),
      billedAmount: toInt(r?.billed_amount),
      events: toInt(r?.events_count),
      overageEvents: toInt(r?.overage_events),
    }));

    const topRoutes = (byRouteRows || []).map((r) => ({
      route: r?.route || null,
      tokens: toInt(r?.tokens_total),
      events: toInt(r?.events_count),
      overageEvents: toInt(r?.overage_events),
    }));

    const topModels = (byModelRows || []).map((r) => ({
      model: r?.model || 'unknown',
      tokens: toInt(r?.tokens_total),
      events: toInt(r?.events_count),
      overageEvents: toInt(r?.overage_events),
    }));

    const billedByCurrency = (billedByCurrencyRows || []).map((r) => ({
      currency: r?.currency || 'unknown',
      billedAmount: toInt(r?.billed_amount),
      invoiceItems: toInt(r?.invoice_items),
    }));

    res.status(200).json({
      data: {
        range: {
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        },
        filters: {
          workspaceId,
        },
        totals,
        byDay,
        topWorkspaces,
        topRoutes,
        topModels,
        billedByCurrency,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Failed to fetch AI usage metrics' } });
  }
}
