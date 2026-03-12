import prisma from '@/prisma/index';

export const getTemplates = async (workspaceId) => {
  return await prisma.messageTemplate.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  });
};

const toDateString = (value) => {
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const toStringSafe = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return `${value}`;
  if (value instanceof Date) return toDateString(value);
  if (value?.constructor?.name === 'Decimal' && typeof value.toString === 'function') return value.toString();
  return `${value}`;
};

const inferDealId = (eventData) => {
  if (!eventData || typeof eventData !== 'object') return null;
  if (eventData.dealId) return eventData.dealId;
  if (eventData.deal?.id) return eventData.deal.id;
  if (eventData.stageId && typeof eventData.name === 'string' && eventData.id) return eventData.id;
  return null;
};

const inferContactId = (eventData) => {
  if (!eventData || typeof eventData !== 'object') return null;
  return eventData.contactId || eventData.contact?.id || null;
};

const inferConversationId = (eventData) => {
  if (!eventData || typeof eventData !== 'object') return null;
  return eventData.conversationId || eventData.conversation?.id || null;
};

const hydrateTemplateContext = async (workspaceId, eventData) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true },
  });

  let conversation = eventData?.conversation || null;
  let contact = eventData?.contact || null;
  let deal = eventData?.deal || null;

  const conversationId = inferConversationId(eventData);
  if (!conversation && conversationId) {
    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        contact: { include: { company: true } },
      },
    });
  }

  if (!contact && conversation?.contact) contact = conversation.contact;

  const contactId = inferContactId(eventData);
  if (!contact && contactId) {
    contact = await prisma.contact.findFirst({
      where: { id: contactId, workspaceId },
      include: { company: true },
    });
  } else if (contact && !contact.company && contact.companyId) {
    contact = await prisma.contact.findFirst({
      where: { id: contact.id, workspaceId },
      include: { company: true },
    });
  }

  const dealId = inferDealId(eventData);
  if (!deal && dealId) {
    deal = await prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: {
        stage: true,
        company: true,
        contact: { include: { company: true } },
      },
    });
  } else if (deal && !deal.stage && deal.id) {
    deal = await prisma.deal.findFirst({
      where: { id: deal.id, workspaceId },
      include: {
        stage: true,
        company: true,
        contact: { include: { company: true } },
      },
    });
  }

  const assignee = eventData?.assignee || conversation?.assignee || null;
  const company = deal?.company || contact?.company || deal?.contact?.company || null;

  return { workspace, conversation, contact, deal, company, assignee };
};

const getValueByPath = (obj, path) => {
  if (!obj || typeof obj !== 'object') return undefined;
  if (!path || typeof path !== 'string') return undefined;

  const parts = path.split('.').filter(Boolean);
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = current[part];
  }

  return current;
};

export const renderTemplateString = async (workspaceId, template, eventData = {}) => {
  if (!template || typeof template !== 'string') return '';
  const ctx = await hydrateTemplateContext(workspaceId, eventData);

  const resolvePlaceholder = (rawKey) => {
    const key = `${rawKey || ''}`.trim();
    if (!key) return '';

    if (key === 'contact.firstName') {
      return toStringSafe((ctx.contact?.name || '').split(' ')[0]);
    }
    if (key === 'deal.stageName') {
      return toStringSafe(ctx.deal?.stage?.name);
    }
    if (key === 'deal.closeDate') {
      return toDateString(ctx.deal?.closeDate);
    }
    if (key === 'now.date') {
      return toDateString(new Date());
    }
    if (key === 'now.year') {
      return `${new Date().getFullYear()}`;
    }

    const value = getValueByPath(ctx, key);
    return toStringSafe(value);
  };

  return template.replace(/{{\s*([^{}]+?)\s*}}/g, (_, rawKey) => resolvePlaceholder(rawKey));
};

export const createTemplate = async (workspaceId, { name, content }) => {
  return await prisma.messageTemplate.create({
    data: {
      workspaceId,
      name,
      content,
    },
  });
};

export const deleteTemplate = async (id, workspaceId) => {
  return await prisma.messageTemplate.deleteMany({
    where: {
      id,
      workspaceId
    },
  });
};

export const updateTemplate = async (id, workspaceId, { name, content }) => {
  return await prisma.messageTemplate.updateMany({
    where: {
      id,
      workspaceId,
    },
    data: {
      name,
      content,
    },
  });
};
