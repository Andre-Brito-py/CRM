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

export const deleteTag = async (id) => {
  return await prisma.tag.delete({
    where: { id },
  });
};

export const updateTag = async (id, { name, color }) => {
  return await prisma.tag.update({
    where: { id },
    data: {
      name,
      color,
    },
  });
};
