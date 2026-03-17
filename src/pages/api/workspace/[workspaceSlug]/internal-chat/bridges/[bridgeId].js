import { InvitationStatus } from '@prisma/client';
import { validateSession } from '@/config/api-validation';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { deleteBridgeForWorkspace } from '@/prisma/services/internalChat';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, bridgeId } = req.query;

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

  if (method === 'DELETE') {
    const isOwner = isWorkspaceOwner(session.user.email, workspace);
    if (!isOwner) {
      return res.status(403).json({ error: { msg: 'Forbidden' } });
    }

    try {
      const deleted = await deleteBridgeForWorkspace({
        bridgeId: String(bridgeId || ''),
        workspaceId: workspace.id,
      });
      if (!deleted) {
        return res.status(404).json({ error: { msg: 'Bridge not found' } });
      }
      return res.status(200).json({ data: { ok: true } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Unable to delete bridge' } });
    }
  }

  return res.status(405).json({ error: { msg: `${method} method unsupported` } });
};

export default handler;

