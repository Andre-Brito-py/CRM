import { InvitationStatus } from '@prisma/client';
import { validateSession } from '@/config/api-validation';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { createBridgeBetweenWorkspaces, listBridgesForWorkspace } from '@/prisma/services/internalChat';

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

  if (method === 'GET') {
    try {
      const bridges = await listBridgesForWorkspace(workspace.id);
      const normalized = (bridges || []).map((b) => ({
        id: b.id,
        name: b.name,
        createdAt: b.createdAt,
        createdById: b.createdById,
        workspaces: (b.workspaces || []).map((w) => w.workspace),
      }));
      return res.status(200).json({ data: { bridges: normalized } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Unable to fetch bridges' } });
    }
  }

  if (method === 'POST') {
    const isOwner = isWorkspaceOwner(session.user.email, workspace);
    if (!isOwner) {
      return res.status(403).json({ error: { msg: 'Forbidden' } });
    }

    try {
      const otherWorkspaceSlug = String(req.body?.otherWorkspaceSlug || '').trim();
      const name = req.body?.name;

      if (!otherWorkspaceSlug) {
        return res.status(400).json({ error: { msg: 'otherWorkspaceSlug is required' } });
      }
      if (otherWorkspaceSlug === workspace.slug) {
        return res.status(400).json({ error: { msg: 'Cannot connect a workspace to itself' } });
      }

      const otherWorkspace = await getWorkspace(userId, session.user.email, otherWorkspaceSlug);
      if (!otherWorkspace?.id) {
        return res.status(404).json({ error: { msg: 'Other workspace not found or permission denied' } });
      }

      const isOwnerOther = isWorkspaceOwner(session.user.email, otherWorkspace);
      if (!isOwnerOther) {
        return res.status(403).json({ error: { msg: 'Forbidden' } });
      }

      const existing = await prisma.internalChatBridge.findFirst({
        where: {
          deletedAt: null,
          AND: [
            { workspaces: { some: { workspaceId: workspace.id } } },
            { workspaces: { some: { workspaceId: otherWorkspace.id } } },
          ],
        },
        select: { id: true },
      });
      if (existing?.id) {
        return res.status(200).json({ data: { bridge: existing, alreadyExists: true } });
      }

      const bridge = await createBridgeBetweenWorkspaces({
        name,
        createdById: userId,
        workspaceId: workspace.id,
        otherWorkspaceId: otherWorkspace.id,
      });

      return res.status(201).json({ data: { bridge } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Unable to create bridge' } });
    }
  }

  return res.status(405).json({ error: { msg: `${method} method unsupported` } });
};

export default handler;

