import prisma from '@/prisma/index';
import { createNotification } from '@/prisma/services/notification';

export const createTask = async (workspaceId, { title, content, dueDate, priority, assigneeId, contactId, dealId }) => {
  const task = await prisma.task.create({
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

  if (assigneeId) {
    createNotification(workspaceId, {
      userId: assigneeId,
      title: 'Nova Tarefa Atribuída',
      content: `Você recebeu uma nova tarefa: ${title}`,
      link: `/account/${workspaceId}/tasks`,
    }).catch(err => console.error('Notification error:', err));
  }

  return task;
};

export const getTasks = async (workspaceId, filters = {}) => {
  const { assigneeId, contactId, dealId, isCompleted, take, skip } = filters;

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
    ...(Number.isFinite(take) ? { take } : {}),
    ...(Number.isFinite(skip) ? { skip } : {}),
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

/**
 * Get a single task — workspaceId enforces multi-tenant isolation.
 */
export const getTask = async (id, workspaceId) => {
  return await prisma.task.findFirst({
    where: {
      id,
      workspaceId,
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

/**
 * Update a task — workspaceId enforces multi-tenant isolation.
 */
export const updateTask = async (id, workspaceId, data) => {
  return await prisma.task.updateMany({
    where: { id, workspaceId },
    data,
  });
};

/**
 * Soft-delete a task — workspaceId enforces multi-tenant isolation.
 */
export const deleteTask = async (id, workspaceId) => {
  return await prisma.task.updateMany({
    where: { id, workspaceId },
    data: { deletedAt: new Date() },
  });
};
