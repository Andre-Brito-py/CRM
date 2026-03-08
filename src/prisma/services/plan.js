import prisma from '@/prisma/index';

export const createPlan = async (name, slug, price, interval, currency, features, stripePriceId, description) => {
  return await prisma.plan.create({
    data: {
      name,
      slug,
      price,
      interval,
      currency,
      features,
      stripePriceId,
      description,
    },
  });
};

export const getPlan = async (id) => {
  return await prisma.plan.findUnique({
    where: { id },
  });
};

export const updatePlan = async (id, data) => {
  return await prisma.plan.update({
    where: { id },
    data,
  });
};

export const deletePlan = async (id) => {
  return await prisma.plan.delete({
    where: { id },
  });
};

export const getAllPlans = async () => {
  return await prisma.plan.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
};
