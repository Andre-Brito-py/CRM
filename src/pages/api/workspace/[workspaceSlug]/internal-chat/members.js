import { InvitationStatus } from '@prisma/client';
import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { getMembersByWorkspaceId } from '@/prisma/services/membership';

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
      const members = await getMembersByWorkspaceId(workspace.id);
      const accepted = (members || [])
        .filter((m) => m?.status === InvitationStatus.ACCEPTED && m?.member?.id)
        .map((m) => ({
          id: m.member.id,
          name: m.member.name,
          email: m.member.email,
          image: m.member.image,
          teamRole: m.teamRole,
        }));
      return res.status(200).json({ data: { members: accepted } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Unable to fetch members' } });
    }
  }

  return res.status(405).json({ error: { msg: `${method} method unsupported` } });
};

export default handler;

