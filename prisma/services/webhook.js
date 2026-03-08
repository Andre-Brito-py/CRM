import prisma from '@/prisma/index';

export const getWebhooks = async (workspaceId) => {
  return await prisma.webhook.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const createWebhook = async (workspaceId, url, events) => {
  const secret = `wh_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  
  return await prisma.webhook.create({
    data: {
      workspaceId,
      url,
      events,
      secret,
    },
  });
};

export const deleteWebhook = async (workspaceId, webhookId) => {
  const webhook = await prisma.webhook.findFirst({
    where: {
      id: webhookId,
      workspaceId,
    },
  });

  if (webhook) {
    await prisma.webhook.delete({
      where: {
        id: webhookId,
      },
    });
    return true;
  }
  
  return false;
};
