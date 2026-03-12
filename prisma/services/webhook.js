import prisma from '@/prisma/index';
import crypto from 'crypto';

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
  const secret = `wh_${crypto.randomBytes(24).toString('hex')}`;

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

export const rotateWebhookSecret = async (workspaceId, webhookId) => {
  const webhook = await prisma.webhook.findFirst({
    where: {
      id: webhookId,
      workspaceId,
    },
  });

  if (!webhook) return null;

  const secret = `wh_${crypto.randomBytes(24).toString('hex')}`;

  return await prisma.webhook.update({
    where: {
      id: webhookId,
    },
    data: {
      secret,
    },
  });
};
