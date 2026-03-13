import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';
import { createPlatformAuditActivity } from '@/prisma/services/activity';

const getActor = (session) => ({
  userId: session?.user?.userId || session?.user?.id || null,
  email: session?.user?.email || null,
});

const pickWorkspaceIdForPlatformAction = async ({ userId, email }) => {
  const or = [];
  if (userId) or.push({ creatorId: userId });
  if (email) or.push({ members: { some: { deletedAt: null, email } } });
  if (or.length === 0) return null;

  const workspace = await prisma.workspace.findFirst({
    where: { deletedAt: null, OR: or },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  return workspace?.id || null;
};

const safeJsonParse = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const computeDeadlines = ({ severity, base = new Date() }) => {
  const s = String(severity || '').toUpperCase();
  const map = {
    P0: { responseMinutes: 15, resolveMinutes: 4 * 60 },
    P1: { responseMinutes: 60, resolveMinutes: 24 * 60 },
    P2: { responseMinutes: 4 * 60, resolveMinutes: 3 * 24 * 60 },
    P3: { responseMinutes: 24 * 60, resolveMinutes: 7 * 24 * 60 },
  };
  const cfg = map[s] || map.P2;
  return {
    responseDueAt: new Date(base.getTime() + cfg.responseMinutes * 60 * 1000),
    resolveDueAt: new Date(base.getTime() + cfg.resolveMinutes * 60 * 1000),
  };
};

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const incidents = await prisma.activity.findMany({
        where: { type: 'INCIDENT' },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return res.status(200).json({
        data: {
          incidents: incidents.map((i) => ({
            ...i,
            details: safeJsonParse(i.content),
          })),
        },
      });
    } catch (error) {
      return res.status(500).json({ error: { msg: error?.message || 'Failed to fetch incidents' } });
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: { msg: 'Invalid JSON body' } });
      }
    }

    const { title, severity, summary } = body || {};
    const normalizedTitle = String(title || '').trim();
    const normalizedSeverity = String(severity || '').trim().toUpperCase();
    const normalizedSummary = String(summary || '').trim() || null;

    if (!normalizedTitle) {
      return res.status(400).json({ error: { msg: 'Missing title' } });
    }

    const actor = getActor(session);
    const workspaceId = await pickWorkspaceIdForPlatformAction(actor);
    if (!workspaceId) {
      return res.status(400).json({ error: { msg: 'Workspace not found for incident logging' } });
    }

    const now = new Date();
    const { responseDueAt, resolveDueAt } = computeDeadlines({ severity: normalizedSeverity, base: now });

    const incident = await prisma.activity.create({
      data: {
        workspaceId,
        userId: actor.userId,
        type: 'INCIDENT',
        title: normalizedTitle,
        content: JSON.stringify({
          status: 'OPEN',
          severity: normalizedSeverity || 'P2',
          summary: normalizedSummary,
          acknowledgedAt: null,
          resolvedAt: null,
          responseDueAt: responseDueAt.toISOString(),
          resolveDueAt: resolveDueAt.toISOString(),
          lastUpdatedAt: now.toISOString(),
        }),
      },
      select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
    });

    await createPlatformAuditActivity(
      actor.userId,
      actor.email,
      {
        action: 'INCIDENT_CREATE',
        title: 'Incident created',
        target: { incidentId: incident.id },
        metadata: { severity: normalizedSeverity || 'P2' },
      },
      req
    );

    return res.status(200).json({ data: { incident: { ...incident, details: safeJsonParse(incident.content) } } });
  }

  return res.status(405).json({ error: { msg: 'Method not supported' } });
}

