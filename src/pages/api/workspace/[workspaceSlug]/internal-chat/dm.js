import { InvitationStatus } from '@prisma/client';
import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { getOrCreateDmChannel } from '@/prisma/services/internalChat';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;

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

  if (method === 'POST') {
    try {
      const targetUserId = String(req.body?.targetUserId || '').trim();
      if (!targetUserId) {
        return res.status(400).json({ error: { msg: 'targetUserId is required' } });
      }
      if (targetUserId === userId) {
        return res.status(400).json({ error: { msg: 'Cannot create DM with yourself' } });
      }

      const targetMembership = await prisma.member.findFirst({
        where: {
          workspaceId: workspace.id,
          deletedAt: null,
          status: InvitationStatus.ACCEPTED,
          member: { id: targetUserId },
        },
        select: { id: true },
      });
      if (!targetMembership) {
        return res.status(404).json({ error: { msg: 'User not found in this workspace' } });
      }

      const channel = await getOrCreateDmChannel({
        workspaceId: workspace.id,
        userId1: userId,
        userId2: targetUserId,
      });

      return res.status(200).json({ data: { channel } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Unable to create DM' } });
    }
  }

  return res.status(405).json({ error: { msg: `${method} method unsupported` } });
};

export default handler;

