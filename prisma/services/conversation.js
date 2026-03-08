import prisma from '@/prisma/index';

export const getConversations = async (workspaceId) => {
  return await prisma.conversation.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    include: {
      contact: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
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
      messages: {
        orderBy: { createdAt: 'asc' },
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

  // Update conversation updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
};
