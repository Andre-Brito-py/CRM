import prisma from '@/prisma/index';

export const getTags = async (workspaceId) => {
  return await prisma.tag.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  });
};

export const createTag = async (workspaceId, { name, color }) => {
  return await prisma.tag.create({
    data: {
      workspaceId,
      name,
      color,
    },
  });
};

export const deleteTag = async (id, workspaceId) => {
  return await prisma.tag.deleteMany({
    where: { id, workspaceId },
  });
};

export const updateTag = async (id, workspaceId, { name, color }) => {
  return await prisma.tag.updateMany({
    where: { id, workspaceId },
    data: {
      name,
      color,
    },
  });
};
