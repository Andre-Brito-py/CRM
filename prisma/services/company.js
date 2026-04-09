import prisma from '@/prisma/index';

export const createCompany = async (workspaceId, { name, website, industry }) => {
  return await prisma.company.create({
    data: {
      workspaceId,
      name,
      website,
      industry,
    },
  });
};

export const getCompanies = async (workspaceId) => {
  return await prisma.company.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      contacts: true,
      deals: true,
    },
  });
};

export const getCompany = async (id) => {
  return await prisma.company.findFirst({
    where: { id, deletedAt: null },
    include: {
      contacts: true,
      deals: {
        include: {
          stage: true,
        },
      },
    },
  });
};

export const updateCompany = async (id, data) => {
  return await prisma.company.update({
    where: { id },
    data,
  });
};

export const deleteCompany = async (id) => {
  return await prisma.company.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
};
