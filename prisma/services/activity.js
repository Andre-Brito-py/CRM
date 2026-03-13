import prisma from '@/prisma/index';

export const createActivity = async (workspaceId, userId, { type, title, content, dealId, contactId }) => {
  return await prisma.activity.create({
    data: {
      workspaceId,
      userId,
      type,
      title,
      content,
      dealId,
      contactId,
    },
  });
};

const getRequestIp = (req) => {
  const forwardedFor = String(req?.headers?.['x-forwarded-for'] || '').trim();
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = String(req?.headers?.['x-real-ip'] || '').trim();
  if (realIp) return realIp;
  return null;
};

const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

export const createAuditActivity = async (workspaceId, userId, { action, title, target, metadata }, req) => {
  const requestId = String(req?.headers?.['x-request-id'] || '').trim() || null;
  const userAgent = String(req?.headers?.['user-agent'] || '').trim() || null;
  const ip = getRequestIp(req);
  const route = String(req?.url || '').trim() || null;
  const method = String(req?.method || '').trim() || null;

  const content = safeStringify({
    action: String(action || '').trim() || null,
    target: target || null,
    metadata: metadata || null,
    request: {
      id: requestId,
      ip,
      userAgent,
      route,
      method,
    },
  });

  return await createActivity(workspaceId, userId, {
    type: `AUDIT_${String(action || 'EVENT').trim().toUpperCase()}`,
    title: title || String(action || 'audit_event'),
    content,
  });
};

export const createPlatformAuditActivity = async (userId, email, payload, req) => {
  const actorId = userId || null;
  const actorEmail = email || null;
  const or = [];
  if (actorId) or.push({ creatorId: actorId });
  if (actorEmail) or.push({ members: { some: { deletedAt: null, email: actorEmail } } });
  if (or.length === 0) return null;

  const workspace = await prisma.workspace.findFirst({
    where: { deletedAt: null, OR: or },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!workspace) return null;
  return await createAuditActivity(workspace.id, actorId, payload, req);
};

export const getActivities = async (workspaceId, limit = 10) => {
  return await prisma.activity.findMany({
    where: { workspaceId },
    take: limit,
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
};
