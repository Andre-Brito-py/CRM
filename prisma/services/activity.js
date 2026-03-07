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
