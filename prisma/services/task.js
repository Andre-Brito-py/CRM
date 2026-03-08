import prisma from '@/prisma/index';

export const createTask = async (workspaceId, { title, content, dueDate, priority, assigneeId, contactId, dealId }) => {
  return await prisma.task.create({
    data: {
      workspaceId,
      title,
      content,
      dueDate,
      priority,
      assigneeId,
      contactId,
      dealId,
    },
  });
};

export const getTasks = async (workspaceId, filters = {}) => {
  const { assigneeId, contactId, dealId, isCompleted } = filters;

  const where = {
    workspaceId,
    deletedAt: null,
  };

  if (assigneeId) where.assigneeId = assigneeId;
  if (contactId) where.contactId = contactId;
  if (dealId) where.dealId = dealId;
  if (isCompleted !== undefined) where.isCompleted = isCompleted;

  return await prisma.task.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      deal: {
        select: {
          id: true,
          name: true,
          amount: true,
        },
      },
    },
  });
};

export const getTask = async (id) => {
  return await prisma.task.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      deal: {
        select: {
          id: true,
          name: true,
          amount: true,
        },
      },
    },
  });
};

export const updateTask = async (id, data) => {
  return await prisma.task.update({
    where: { id },
    data,
  });
};

export const deleteTask = async (id) => {
  return await prisma.task.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
