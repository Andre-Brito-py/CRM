import prisma from '@/prisma/index';

export const createContact = async (workspaceId, { name, email, phone, jobTitle, companyId }) => {
  return await prisma.contact.create({
    data: {
      workspaceId,
      name,
      email,
      phone,
      jobTitle,
      companyId,
    },
  });
};

export const getContacts = async (workspaceId) => {
  return await prisma.contact.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      company: true,
      deals: true,
    },
  });
};

export const getContact = async (id) => {
  return await prisma.contact.findUnique({
    where: { id },
    include: {
      company: true,
      deals: {
        include: {
          stage: true,
        },
      },
    },
  });
};

export const updateContact = async (id, data) => {
  return await prisma.contact.update({
    where: { id },
    data,
  });
};

export const deleteContact = async (id) => {
  return await prisma.contact.delete({
    where: { id },
  });
};
