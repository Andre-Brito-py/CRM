import prisma from '@/prisma/index';
import { canAddContact } from '@/lib/server/subscription';

/**
 * Create a contact in a workspace.
 */
export const createContact = async (workspaceId, { name, email, phone, jobTitle, companyId, customFields }) => {
  return await prisma.contact.create({
    data: { workspaceId, name, email, phone, jobTitle, companyId, customFields },
    // Return only what the UI needs immediately — avoids refetching heavy includes
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      createdAt: true,
      companyId: true,
      customFields: true,
    },
  });
};

/**
 * List contacts — lightweight payload for the contacts table.
 * Includes company name + deal count instead of full nested objects.
 */
export const getContacts = async (workspaceId, { take, skip } = {}) => {
  return await prisma.contact.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    ...(Number.isFinite(take) ? { take } : {}),
    ...(Number.isFinite(skip) ? { skip } : {}),
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      createdAt: true,
      customFields: true,
      company: {
        select: { id: true, name: true },
      },
      tags: {
        select: { id: true, name: true, color: true },
      },
      // Only count — no full deal objects on the list view
      _count: {
        select: { deals: true, activities: true },
      },
    },
  });
};

/**
 * Get a single contact with full details — only called on the contact detail page.
 */
export const getContact = async (id) => {
  return await prisma.contact.findUnique({
    where: { id },
    include: {
      company: true,
      deals: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          amount: true,
          priority: true,
          stage: { select: { id: true, name: true, color: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      tags: {
        select: { id: true, name: true, color: true },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 30, // Cap activities to last 30
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          createdAt: true,
          user: { select: { name: true, image: true } },
        },
      },
    },
  });
};

export const updateContact = async (id, data) => {
  return await prisma.contact.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      customFields: true,
      updatedAt: true,
    },
  });
};

export const deleteContact = async (id) => {
  return await prisma.contact.delete({ where: { id } });
};
