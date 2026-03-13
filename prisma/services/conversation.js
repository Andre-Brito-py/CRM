import prisma from '@/prisma/index';

export const getConversations = async (workspaceId, filters = {}, options = {}) => {
  const where = { workspaceId };

  if (filters.assigneeId) {
    if (filters.assigneeId === 'unassigned') {
      where.assigneeId = null;
    } else {
      where.assigneeId = filters.assigneeId;
    }
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      {
        contact: {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      },
      {
        messages: {
          some: {
            content: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
      },
      {
        externalId: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  const page = Number.isFinite(options.page) ? Math.max(1, options.page) : 1;
  const pageSizeRaw = Number.isFinite(options.pageSize) ? options.pageSize : 50;
  const pageSize = Math.max(1, Math.min(100, pageSizeRaw));
  const skip = (page - 1) * pageSize;

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    skip,
    take: pageSize + 1,
    include: {
      contact: true,
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const hasMore = rows.length > pageSize;
  const pageItems = rows.slice(0, pageSize);

  return {
    conversations: pageItems.map((c) => ({
      ...c,
      lastMessage: c.messages[0]?.content || '',
      lastMessageAt: c.messages[0]?.createdAt || c.updatedAt,
    })),
    meta: {
      page,
      pageSize,
      hasMore,
    },
  };
};

export const createConversation = async (workspaceId, { contactId, platform, externalId }) => {
  return await prisma.conversation.create({
    data: {
      workspaceId,
      contactId,
      platform,
      externalId,
    },
  });
};

export const getConversation = async (id) => {
  return await prisma.conversation.findUnique({
    where: { id },
    include: {
      contact: true,
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
};

export const updateConversation = async (id, data) => {
  return await prisma.conversation.update({
    where: { id },
    data,
    include: {
      contact: true,
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
};

export const createMessage = async (conversationId, { direction, type, content, mediaUrl, status, externalId }) => {
  const message = await prisma.message.create({
    data: {
      conversationId,
      direction,
      type,
      content,
      mediaUrl,
      status,
      externalId,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
};
