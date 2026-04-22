import prisma from '@/prisma/index';

const buildDmKey = (userId1, userId2) => {
  const a = String(userId1 || '').trim();
  const b = String(userId2 || '').trim();
  const [left, right] = a < b ? [a, b] : [b, a];
  return { key: `dm:${left}:${right}`, userAId: left, userBId: right };
};

export const getOrCreateTeamChannel = async (workspaceId) => {
  const existing = await prisma.internalChatChannel.findFirst({
    where: {
      workspaceId,
      key: 'team',
      deletedAt: null,
    },
  });
  if (existing) return existing;

  return await prisma.internalChatChannel.create({
    data: {
      workspaceId,
      key: 'team',
      kind: 'TEAM',
      title: null,
    },
  });
};

export const listChannelsForUser = async ({ workspaceId, userId }) => {
  const [team, teamLastMessage, dms] = await Promise.all([
    getOrCreateTeamChannel(workspaceId),
    prisma.internalChatMessage.findFirst({
      where: { workspaceId, deletedAt: null, channel: { key: 'team', deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true, authorId: true },
    }),
    prisma.internalChatChannel.findMany({
      where: {
        workspaceId,
        kind: 'DIRECT',
        deletedAt: null,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        userA: { select: { id: true, name: true, email: true, image: true } },
        userB: { select: { id: true, name: true, email: true, image: true } },
        messages: {
          where: { deletedAt: null },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, content: true, createdAt: true, authorId: true },
        },
      },
    }),
  ]);

  const dmChannels = dms.map((c) => ({
    ...c,
    lastMessage: c.messages?.[0] || null,
    messages: undefined,
  }));

  return { teamChannel: { ...team, lastMessage: teamLastMessage || null }, dmChannels };
};

export const getOrCreateDmChannel = async ({ workspaceId, userId1, userId2 }) => {
  const { key, userAId, userBId } = buildDmKey(userId1, userId2);
  const existing = await prisma.internalChatChannel.findFirst({
    where: { workspaceId, key, deletedAt: null },
  });
  if (existing) return existing;

  return await prisma.internalChatChannel.create({
    data: {
      workspaceId,
      key,
      kind: 'DIRECT',
      userAId,
      userBId,
      title: null,
    },
  });
};

export const listMessages = async ({ workspaceId, channelId, limit = 100 }) => {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 100;
  return await prisma.internalChatMessage.findMany({
    where: { workspaceId, channelId, deletedAt: null },
    take: safeLimit,
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
    },
  });
};

const findBridgedWorkspaceIds = async ({ workspaceId }) => {
  const bridgeMemberships = await prisma.internalChatBridgeWorkspace.findMany({
    where: { workspaceId, bridge: { deletedAt: null } },
    select: { bridgeId: true },
  });

  const bridgeIds = [...new Set(bridgeMemberships.map((b) => b.bridgeId))];
  if (bridgeIds.length === 0) return [];

  const memberships = await prisma.internalChatBridgeWorkspace.findMany({
    where: { bridgeId: { in: bridgeIds } },
    select: { workspaceId: true },
  });

  return [...new Set(memberships.map((m) => m.workspaceId))].filter((id) => id !== workspaceId);
};

export const createMessage = async ({ workspaceId, channelId, authorId, content }) => {
  const normalized = String(content || '').trim();
  if (!normalized) {
    const err = new Error('content is required');
    err.statusCode = 400;
    throw err;
  }
  if (normalized.length > 5000) {
    const err = new Error('content is too long');
    err.statusCode = 400;
    throw err;
  }

  const channel = await prisma.internalChatChannel.findFirst({
    where: { id: channelId, workspaceId, deletedAt: null },
    select: { id: true, kind: true },
  });

  if (!channel) {
    const err = new Error('Channel not found');
    err.statusCode = 404;
    throw err;
  }

  const message = await prisma.internalChatMessage.create({
    data: {
      workspaceId,
      channelId,
      authorId,
      content: normalized,
    },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (channel.kind !== 'TEAM') return { message, bridgedToWorkspaceIds: [] };

  const targets = await findBridgedWorkspaceIds({ workspaceId });
  if (targets.length === 0) return { message, bridgedToWorkspaceIds: [] };

  const bridgedToWorkspaceIds = [];
  for (const targetWorkspaceId of targets) {
    const existing = await prisma.internalChatMessage.findFirst({
      where: {
        workspaceId: targetWorkspaceId,
        originMessageId: message.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) continue;

    const targetTeam = await getOrCreateTeamChannel(targetWorkspaceId);
    await prisma.internalChatMessage.create({
      data: {
        workspaceId: targetWorkspaceId,
        channelId: targetTeam.id,
        authorId,
        content: normalized,
        originWorkspaceId: workspaceId,
        originMessageId: message.id,
      },
    });
    bridgedToWorkspaceIds.push(targetWorkspaceId);
  }

  return { message, bridgedToWorkspaceIds };
};

export const listBridgesForWorkspace = async (workspaceId) => {
  return await prisma.internalChatBridge.findMany({
    where: {
      deletedAt: null,
      workspaces: { some: { workspaceId } },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
      createdById: true,
      workspaces: {
        select: {
          workspace: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
};

export const createBridgeBetweenWorkspaces = async ({ name, createdById, workspaceId, otherWorkspaceId }) => {
  // 1. Verify that creator is member of the primary workspace
  const member = await prisma.member.findFirst({
    where: { workspaceId, member: { id: createdById }, deletedAt: null },
  });
  if (!member) throw new Error('Unauthorized');

  const normalizedName = String(name || '').trim() || 'Conexão';

  return await prisma.internalChatBridge.create({
    data: {
      name: normalizedName.slice(0, 80),
      createdById,
      workspaces: {
        create: [{ workspaceId }, { workspaceId: otherWorkspaceId }],
      },
    },
    select: { id: true, name: true, createdAt: true, createdById: true },
  });
};

export const deleteBridgeForWorkspace = async ({ bridgeId, workspaceId }) => {
  const bridge = await prisma.internalChatBridge.findFirst({
    where: {
      id: bridgeId,
      deletedAt: null,
      workspaces: { some: { workspaceId } },
    },
    select: { id: true },
  });

  if (!bridge) return null;

  return await prisma.internalChatBridge.update({
    where: { id: bridgeId },
    data: { deletedAt: new Date() },
    select: { id: true },
  });
};
