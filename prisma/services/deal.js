import prisma from '@/prisma/index';
import { processAutomation } from '@/prisma/services/automation';

export const createDeal = async (workspaceId, { name, amount, closeDate, stageId, contactId, companyId, userId, priority = 'MEDIUM', customFields }) => {
  const deal = await prisma.deal.create({
    data: {
      workspaceId,
      name,
      amount,
      closeDate: closeDate ? new Date(closeDate) : null,
      stageId,
      contactId,
      companyId,
      userId,
      priority,
      customFields,
    },
    include: { contact: true, user: true }
  });

  // Trigger automation: DEAL_CREATED
  // await processAutomation(workspaceId, 'DEAL_CREATED', deal);

  return deal;
};

export const getDeals = async (workspaceId) => {
  return await prisma.deal.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      contact: true,
      company: true,
      stage: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
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
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, image: true },
          },
        },
      },
    },
  });
};

export const updateDeal = async (id, data) => {
  if (data.closeDate) {
    data.closeDate = new Date(data.closeDate);
  }

  // Fetch current deal state if stageId is being updated
  let currentDeal = null;
  if (data.stageId) {
    currentDeal = await prisma.deal.findUnique({ where: { id } });
  }

  const updatedDeal = await prisma.deal.update({
    where: { id },
    data,
    include: {
      contact: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    }
  });

  // Trigger automation: DEAL_STAGE_CHANGED if stageId changed
  if (data.stageId && currentDeal && currentDeal.stageId !== data.stageId) {
    processAutomation(updatedDeal.workspaceId, 'DEAL_STAGE_CHANGED', updatedDeal).catch(err =>
      console.error('Error triggering automation:', err)
    );
  }

  return updatedDeal;
};

export const updateDealStage = async (id, stageId) => {
  const updatedDeal = await prisma.deal.update({
    where: { id },
    data: { stageId },
    include: { contact: true }
  });

  // Trigger automation: DEAL_STAGE_CHANGED
  if (updatedDeal) {
    // Fire and forget automation to not block the UI
    processAutomation(updatedDeal.workspaceId, 'DEAL_STAGE_CHANGED', updatedDeal).catch(err =>
      console.error('Error triggering automation:', err)
    );
  }

  return updatedDeal;
};

export const deleteDeal = async (id) => {
  return await prisma.deal.delete({
    where: { id },
  });
};
