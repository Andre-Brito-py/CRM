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

export const getCompanies = async (workspaceId, { take, skip } = {}) => {
  return await prisma.company.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    ...(Number.isFinite(take) ? { take } : {}),
    ...(Number.isFinite(skip) ? { skip } : {}),
    include: {
      contacts: { select: { id: true } }, // Lightweight include for count
      _count: {
        select: { contacts: true, deals: true },
      },
    },
  });
};

/**
 * Get a single company — workspaceId enforces multi-tenant isolation.
 */
export const getCompany = async (id, workspaceId) => {
  return await prisma.company.findFirst({
    where: { id, workspaceId, deletedAt: null },
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

/**
 * Update a company — workspaceId enforces multi-tenant isolation.
 */
export const updateCompany = async (id, workspaceId, data) => {
  return await prisma.company.updateMany({
    where: { id, workspaceId },
    data,
  });
};

/**
 * Soft-delete a company — workspaceId enforces multi-tenant isolation.
 */
export const deleteCompany = async (id, workspaceId) => {
  return await prisma.company.updateMany({
    where: { id, workspaceId },
    data: { deletedAt: new Date() },
  });
};
