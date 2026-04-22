import prisma from '@/prisma/index';

export const createNotification = async (workspaceId, { userId, title, content, link }) => {
  if (!userId) return null;
  return await prisma.notification.create({
    data: {
      workspace: { connect: { id: workspaceId } },
      user: { connect: { id: userId } },
      title,
      content,
      link,
    },
  });
};

export const getNotifications = async (workspaceId, userId) => {
  const notifications = await prisma.notification.findMany({
    where: {
      workspaceId,
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      workspaceId,
      userId,
      isRead: false,
    },
  });

  return { notifications, unreadCount };
};

export const markAllAsRead = async (workspaceId, userId) => {
  return await prisma.notification.updateMany({
    where: {
      workspaceId,
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
};

export const markAsRead = async (id, workspaceId, userId) => {
  return await prisma.notification.updateMany({
    where: { id, workspaceId, userId },
    data: { isRead: true },
  });
};
