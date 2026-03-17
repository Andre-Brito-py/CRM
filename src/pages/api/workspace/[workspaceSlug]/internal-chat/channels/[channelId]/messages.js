import { InvitationStatus } from '@prisma/client';
import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { createMessage, listMessages } from '@/prisma/services/internalChat';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, channelId } = req.query;

  const session = await validateSession(req, res);
  if (!session) return;

  const userId = session.user.userId || session.user.id;
  const workspace = await getWorkspace(userId, session.user.email, workspaceSlug);
  if (!workspace?.id) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  const membership = await prisma.member.findFirst({
    where: {
      workspaceId: workspace.id,
      email: session.user.email,
      deletedAt: null,
      status: InvitationStatus.ACCEPTED,
    },
    select: { id: true },
  });
  if (!membership) {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  const channel = await prisma.internalChatChannel.findFirst({
    where: { id: String(channelId || ''), workspaceId: workspace.id, deletedAt: null },
    select: { id: true, kind: true, userAId: true, userBId: true },
  });
  if (!channel) {
    return res.status(404).json({ error: { msg: 'Channel not found' } });
  }
  if (channel.kind === 'DIRECT') {
    const canAccess = channel.userAId === userId || channel.userBId === userId;
    if (!canAccess) {
      return res.status(403).json({ error: { msg: 'Forbidden' } });
    }
  }

  if (method === 'GET') {
    try {
      const limitRaw = Number(req.query?.limit);
      const limit = Number.isFinite(limitRaw) ? limitRaw : 100;
      const messages = await listMessages({ workspaceId: workspace.id, channelId: channel.id, limit });
      return res.status(200).json({ data: { messages } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Unable to fetch messages' } });
    }
  }

  if (method === 'POST') {
    try {
      const { message } = await createMessage({
        workspaceId: workspace.id,
        channelId: channel.id,
        authorId: userId,
        content: req.body?.content,
      });
      return res.status(201).json({ data: { message } });
    } catch (error) {
      console.error(error);
      const status = error?.statusCode || 500;
      const msg = status === 500 ? 'Unable to send message' : error?.message || 'Invalid request';
      return res.status(status).json({ error: { msg } });
    }
  }

  return res.status(405).json({ error: { msg: `${method} method unsupported` } });
};

export default handler;

