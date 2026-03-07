import prisma from '@/prisma/index';

export const createPipeline = async (workspaceId, { name }) => {
  return await prisma.pipeline.create({
    data: {
      workspaceId,
      name,
      stages: {
        create: [
          { name: 'Lead', order: 1, color: '#6B7280' },
          { name: 'Qualificado', order: 2, color: '#3B82F6' },
          { name: 'Negociação', order: 3, color: '#F59E0B' },
          { name: 'Fechado', order: 4, color: '#10B981' },
          { name: 'Perdido', order: 5, color: '#EF4444' },
        ],
      },
    },
    include: {
      stages: true,
    },
  });
};

export const getPipelines = async (workspaceId) => {
  return await prisma.pipeline.findMany({
    where: { workspaceId },
    include: {
      stages: {
        orderBy: { order: 'asc' },
        include: {
          deals: {
            orderBy: { createdAt: 'desc' },
            include: {
              company: true,
              contact: true,
            },
          },
        },
      },
    },
  });
};

export const getStages = async (pipelineId) => {
  return await prisma.stage.findMany({
    where: { pipelineId },
    orderBy: { order: 'asc' },
    include: {
      deals: true,
    },
  });
};

export const createStage = async (pipelineId, { name, order, color }) => {
  return await prisma.stage.create({
    data: {
      pipelineId,
      name,
      order,
      color,
    },
  });
};
