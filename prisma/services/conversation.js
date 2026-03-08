import prisma from '@/prisma/index';

export const getConversations = async (workspaceId, filters = {}) => {
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
      }
    ];
  }

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      contact: true,
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  // Flatten last message for easier UI consumption
  return conversations.map(c => ({
    ...c,
    lastMessage: c.messages[0]?.content || '',
    lastMessageAt: c.messages[0]?.createdAt || c.updatedAt,
  }));
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
        }
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
        }
      },
    }
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

  // Update conversation updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
};
