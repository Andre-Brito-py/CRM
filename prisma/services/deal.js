import prisma from '@/prisma/index';
import { processAutomation } from '@/prisma/services/automation';
import { createAuditLog } from '@/lib/server/audit';

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
    include: { contact: true, assignee: true }
  });

  if (deal && deal.assignee) {
    deal.user = deal.assignee;
  }

  // Trigger automation: DEAL_CREATED
  // await processAutomation(workspaceId, 'DEAL_CREATED', deal);

  return deal;
};

export const getDeals = async (workspaceId, options = {}) => {
  const take = options?.take;
  const skip = options?.skip;
  const compact = Boolean(options?.compact);

  if (compact) {
    return await prisma.deal.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: { id: true, name: true },
    });
  }

  const deals = await prisma.deal.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
    include: {
      contact: true,
      company: true,
      stage: true,
      assignee: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return deals.map(d => {
    if (d.assignee) {
      d.user = d.assignee;
    }
    return d;
  });
};

/**
 * Get a single deal — workspaceId enforces multi-tenant isolation.
 */
export const getDeal = async (id, workspaceId) => {
  const deal = await prisma.deal.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: {
      contact: true,
      company: true,
      stage: true,
      assignee: {
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

  if (deal && deal.assignee) {
    deal.user = deal.assignee;
  }
  return deal;
};

/**
 * Update a deal — workspaceId enforces multi-tenant isolation.
 * Uses updateMany so it returns count 0 if workspaceId mismatches (no error thrown).
 */
export const updateDeal = async (id, workspaceId, data) => {
  if (data.closeDate) {
    data.closeDate = new Date(data.closeDate);
  }

  // 1. Verify ownership (Always do this!)
  const existing = await prisma.deal.findFirst({ 
    where: { id, workspaceId, deletedAt: null },
    select: { id: true, stageId: true, workspaceId: true }
  });
  if (!existing) return null;

  // 2. Perform update
  const updatedDeal = await prisma.deal.update({
    where: { id },
    data,
    include: {
      contact: true,
      assignee: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    }
  });

  if (updatedDeal && updatedDeal.assignee) {
    updatedDeal.user = updatedDeal.assignee;
  }

  // Trigger automation: DEAL_STAGE_CHANGED if stageId changed
  if (data.stageId && existing.stageId !== data.stageId) {
    processAutomation(updatedDeal.workspaceId, 'DEAL_STAGE_CHANGED', updatedDeal).catch(err =>
      console.error('Error triggering automation:', err)
    );
  }

  return updatedDeal;
};

/**
 * Update deal stage — workspaceId enforces multi-tenant isolation.
 */
export const updateDealStage = async (id, workspaceId, stageId) => {
  // Verify ownership before update
  const existing = await prisma.deal.findFirst({ where: { id, workspaceId } });
  if (!existing) return null;

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

/**
 * Soft-delete a deal — workspaceId enforces multi-tenant isolation.
 */
export const deleteDeal = async (id, workspaceId, actorId) => {
  const result = await prisma.deal.updateMany({
    where: { id, workspaceId },
    data: { deletedAt: new Date() },
  });

  if (result.count > 0 && actorId) {
    await createAuditLog(workspaceId, actorId, {
      action: 'DEAL_DELETED',
      title: `Deal deleted: ${id}`,
      target: id,
    });
  }

  return result;
};
