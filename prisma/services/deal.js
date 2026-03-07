import prisma from '@/prisma/index';

export const createDeal = async (workspaceId, { name, amount, closeDate, stageId, contactId, companyId, priority = 'MEDIUM' }) => {
  return await prisma.deal.create({
    data: {
      workspaceId,
      name,
      amount,
      closeDate: closeDate ? new Date(closeDate) : null,
      stageId,
      contactId,
      companyId,
      priority,
    },
  });
};

export const getDeals = async (workspaceId) => {
  return await prisma.deal.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      contact: true,
      company: true,
      stage: true,
    },
  });
};

export const getDeal = async (id) => {
  return await prisma.deal.findUnique({
    where: { id },
    include: {
      contact: true,
      company: true,
      stage: true,
    },
  });
};

export const updateDeal = async (id, data) => {
  if (data.closeDate) {
    data.closeDate = new Date(data.closeDate);
  }
  return await prisma.deal.update({
    where: { id },
    data,
  });
};

export const updateDealStage = async (id, stageId) => {
  return await prisma.deal.update({
    where: { id },
    data: { stageId },
  });
};

export const deleteDeal = async (id) => {
  return await prisma.deal.delete({
    where: { id },
  });
};
