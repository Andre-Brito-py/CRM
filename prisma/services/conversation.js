import prisma from '@/prisma/index';
import { createNotification } from '@/prisma/services/notification';
import crypto from 'crypto';

const normalizeAvatarUrl = (value) => {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  return v;
};

const pickCustomAvatarUrl = (customFields) => {
  if (!customFields || typeof customFields !== 'object') return null;
  return normalizeAvatarUrl(
    customFields.avatarUrl ||
    customFields.photoUrl ||
    customFields.profileImageUrl ||
    customFields.profilePictureUrl ||
    customFields.pictureUrl ||
    customFields.imageUrl
  );
};

const gravatarUrlForSeed = (seed) => {
  const normalized = String(seed || '').trim().toLowerCase();
  if (!normalized) return null;
  const hash = crypto.createHash('md5').update(normalized).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=128`;
};

const enrichConversationContact = (conversation) => {
  const contact = conversation?.contact;
  if (!contact) return conversation;

  const platform = String(conversation?.platform || '').toUpperCase();
  const customAvatar = pickCustomAvatarUrl(contact.customFields);
  const seed =
    contact.id ||
    contact.email ||
    contact.phone ||
    conversation.externalId ||
    conversation.id;
  const identiconAvatar = gravatarUrlForSeed(`${platform}:${seed}`);
  const emailAvatar = platform === 'EMAIL' ? gravatarUrlForSeed(contact.email) : null;
  const image = customAvatar || emailAvatar || identiconAvatar || null;

  return {
    ...conversation,
    contact: {
      ...contact,
      image,
    },
  };
};

export const getConversations = async (workspaceId, filters = {}, options = {}) => {
  const where = { workspaceId };

  if (filters.assigneeId) {
    if (filters.assigneeId === 'unassigned') {
      where.assigneeId = null;
    } else {
      where.assigneeId = filters.assigneeId;
    }
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      {
        contact: {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      },
      {
        messages: {
          some: {
            content: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
      },
      {
        externalId: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  const page = Number.isFinite(options.page) ? Math.max(1, options.page) : 1;
  const pageSizeRaw = Number.isFinite(options.pageSize) ? options.pageSize : 50;
  const pageSize = Math.max(1, Math.min(100, pageSizeRaw));
  const skip = (page - 1) * pageSize;

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    skip,
    take: pageSize + 1,
    include: {
      contact: true,
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const hasMore = rows.length > pageSize;
  const pageItems = rows.slice(0, pageSize);

  return {
    conversations: pageItems
      .map((c) => ({
        ...c,
        lastMessage: c.messages[0]?.content || '',
        lastMessageAt: c.messages[0]?.createdAt || c.updatedAt,
      }))
      .map(enrichConversationContact),
    meta: {
      page,
      pageSize,
      hasMore,
    },
  };
};

export const createConversation = async (workspaceId, { contactId, platform, externalId }) => {
  return await prisma.conversation.create({
    data: {
      workspaceId,
      contactId,
      platform,
      externalId,
    },
  });
};

export const getConversation = async (id) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      contact: true,
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  return enrichConversationContact(conversation);
};

export const updateConversation = async (id, data) => {
  const conversation = await prisma.conversation.update({
    where: { id },
    data,
    include: {
      contact: true,
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
  return enrichConversationContact(conversation);
};

export const createMessage = async (conversationId, { direction, type, content, mediaUrl, status, externalId }) => {
  const message = await prisma.message.create({
    data: {
      conversationId,
      direction,
      type,
      content,
      mediaUrl,
      status,
      externalId,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Notify assignee if message is INBOUND/INCOMING
  if (direction === 'INBOUND' || direction === 'INCOMING') {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { workspaceId: true, assigneeId: true, workspace: { select: { slug: true } } }
    });

    if (conversation?.assigneeId) {
      createNotification(conversation.workspaceId, {
        userId: conversation.assigneeId,
        title: 'Nova Mensagem Recebida',
        content: content || 'Você recebeu uma nova mensagem.',
        link: `/account/${conversation.workspace.slug}/inbox?id=${conversationId}`,
      }).catch(err => console.error('Notification error:', err));
    }
  }

  return message;
};
