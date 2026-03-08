import prisma from '@/prisma/index';

export const getTemplates = async (workspaceId) => {
  return await prisma.messageTemplate.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  });
};

export const createTemplate = async (workspaceId, { name, content }) => {
  return await prisma.messageTemplate.create({
    data: {
      workspaceId,
      name,
      content,
    },
  });
};

export const deleteTemplate = async (id, workspaceId) => {
  return await prisma.messageTemplate.deleteMany({
    where: {
      id,
      workspaceId
    },
  });
};

export const updateTemplate = async (id, workspaceId, { name, content }) => {
  return await prisma.messageTemplate.updateMany({
    where: {
      id,
      workspaceId,
    },
    data: {
      name,
      content,
    },
  });
};
