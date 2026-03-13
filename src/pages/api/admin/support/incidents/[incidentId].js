import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';
import { createPlatformAuditActivity } from '@/prisma/services/activity';

const getActor = (session) => ({
  userId: session?.user?.userId || session?.user?.id || null,
  email: session?.user?.email || null,
});

const safeJsonParse = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const { incidentId } = req.query;
  if (!incidentId) {
    return res.status(400).json({ error: { msg: 'Missing incidentId' } });
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: { msg: 'Method not supported' } });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: { msg: 'Invalid JSON body' } });
    }
  }

  const { action } = body || {};
  const normalizedAction = String(action || '').trim().toUpperCase();
  if (!normalizedAction) {
    return res.status(400).json({ error: { msg: 'Missing action' } });
  }

  const actor = getActor(session);

  const existing = await prisma.activity.findUnique({
    where: { id: incidentId },
    select: { id: true, content: true, title: true },
  });
  if (!existing) {
    return res.status(404).json({ error: { msg: 'Incident not found' } });
  }

  const details = safeJsonParse(existing.content) || {};
  const now = new Date().toISOString();

  if (normalizedAction === 'ACK') {
    if (!details.acknowledgedAt) details.acknowledgedAt = now;
    details.lastUpdatedAt = now;
    const updated = await prisma.activity.update({
      where: { id: incidentId },
      data: { content: JSON.stringify(details) },
      select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
    });

    await createPlatformAuditActivity(
      actor.userId,
      actor.email,
      { action: 'INCIDENT_ACK', title: 'Incident acknowledged', target: { incidentId }, metadata: null },
      req
    );

    return res.status(200).json({ data: { incident: { ...updated, details: safeJsonParse(updated.content) } } });
  }

  if (normalizedAction === 'RESOLVE') {
    details.status = 'RESOLVED';
    if (!details.resolvedAt) details.resolvedAt = now;
    details.lastUpdatedAt = now;

    const updated = await prisma.activity.update({
      where: { id: incidentId },
      data: { content: JSON.stringify(details) },
      select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
    });

    await createPlatformAuditActivity(
      actor.userId,
      actor.email,
      { action: 'INCIDENT_RESOLVE', title: 'Incident resolved', target: { incidentId }, metadata: null },
      req
    );

    return res.status(200).json({ data: { incident: { ...updated, details: safeJsonParse(updated.content) } } });
  }

  return res.status(400).json({ error: { msg: 'Unknown action' } });
}

