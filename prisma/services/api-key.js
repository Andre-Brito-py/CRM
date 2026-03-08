import prisma from '@/prisma/index';
import crypto from 'crypto';

export const getApiKeys = async (workspaceId) => {
  return await prisma.apiKey.findMany({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const createApiKey = async (workspaceId, name) => {
  const key = `nk_${crypto.randomBytes(16).toString('hex')}`;
  
  return await prisma.apiKey.create({
    data: {
      workspaceId,
      name,
      key,
    },
  });
};

export const deleteApiKey = async (workspaceId, apiKeyId) => {
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      workspaceId,
    },
  });

  if (apiKey) {
    await prisma.apiKey.delete({
      where: {
        id: apiKeyId,
      },
    });
    return true;
  }
  
  return false;
};
