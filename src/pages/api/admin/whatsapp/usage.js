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

const startOfDayUtc = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

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
    return res.status(405).json({ error: { msg: 'Method not supported' } });
  }

  try {
    const now = new Date();
    const endParam = parseDateOnly(req.query.end);
    const startParam = parseDateOnly(req.query.start);
    const endAt = endParam ? addDaysUtc(startOfDayUtc(endParam), 1) : now;
    const startAt = startParam
      ? startOfDayUtc(startParam)
      : addDaysUtc(startOfDayUtc(now), -30);

    const workspaceId = req.query.workspaceId ? String(req.query.workspaceId) : null;

    const where = {
      createdAt: { gte: startAt, lt: endAt },
      ...(workspaceId ? { workspaceId } : {}),
    };

    const [totalsAgg, byDayRows, byWorkspaceRows] = await Promise.all([
      prisma.whatsAppUsageEvent.aggregate({
        where,
        _count: { id: true },
      }),
      prisma.$queryRaw`
        SELECT
          date_trunc('day', w."createdAt") AS day,
          COUNT(*)::int AS total_events,
          COALESCE(SUM(CASE WHEN w."direction" = 'OUTBOUND' THEN 1 ELSE 0 END), 0)::int AS outbound,
          COALESCE(SUM(CASE WHEN w."direction" = 'INBOUND' THEN 1 ELSE 0 END), 0)::int AS inbound,
          COALESCE(SUM(CASE WHEN w."overageMode" THEN 1 ELSE 0 END), 0)::int AS overage_events
        FROM "whatsapp_usage_events" w
        WHERE
          w."createdAt" >= ${startAt}
          AND w."createdAt" < ${endAt}
          ${workspaceId ? Prisma.sql`AND w."workspaceId" = ${workspaceId}` : Prisma.empty}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.$queryRaw`
        SELECT
          w."workspaceId" AS workspace_id,
          ws."slug" AS workspace_slug,
          ws."name" AS workspace_name,
          COUNT(*)::int AS total_events,
          COALESCE(SUM(CASE WHEN w."direction" = 'OUTBOUND' THEN 1 ELSE 0 END), 0)::int AS outbound,
          COALESCE(SUM(CASE WHEN w."overageMode" THEN 1 ELSE 0 END), 0)::int AS overage_events
        FROM "whatsapp_usage_events" w
        JOIN "workspaces" ws ON ws."id" = w."workspaceId"
        WHERE
          w."createdAt" >= ${startAt}
          AND w."createdAt" < ${endAt}
          ${workspaceId ? Prisma.sql`AND w."workspaceId" = ${workspaceId}` : Prisma.empty}
        GROUP BY 1, 2, 3
        ORDER BY total_events DESC
        LIMIT 15
      `,
    ]);

    const totals = { events: totalsAgg?._count?.id || 0 };

    const byDay = (byDayRows || []).map((r) => ({
      day: r?.day ? new Date(r.day).toISOString().slice(0, 10) : null,
      events: toInt(r?.total_events),
      outbound: toInt(r?.outbound),
      inbound: toInt(r?.inbound),
      overageEvents: toInt(r?.overage_events),
    }));

    const topWorkspaces = (byWorkspaceRows || []).map((r) => ({
      workspaceId: r?.workspace_id || null,
      slug: r?.workspace_slug || null,
      name: r?.workspace_name || null,
      events: toInt(r?.total_events),
      outbound: toInt(r?.outbound),
      overageEvents: toInt(r?.overage_events),
    }));

    res.status(200).json({
      data: {
        range: { startAt: startAt.toISOString(), endAt: endAt.toISOString() },
        filters: { workspaceId },
        totals,
        byDay,
        topWorkspaces,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Failed to fetch WhatsApp usage metrics' } });
  }
}
