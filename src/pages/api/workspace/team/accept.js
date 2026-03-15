import { InvitationStatus } from '@prisma/client';
import prisma from '@/prisma/index';
import { canAddWorkspaceMembers } from '@/lib/server/subscription';

import { validateSession } from '@/config/api-validation';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'PUT') {
    const session = await validateSession(req, res);
    if (!session) return;
    const { memberId } = req.body;

    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        deletedAt: null,
        email: session.user.email,
        status: InvitationStatus.PENDING,
        workspace: { deletedAt: null },
      },
      select: { id: true, workspaceId: true },
    });

    if (!member) {
      return res.status(404).json({ errors: { error: { msg: 'Invitation not found' } } });
    }

    const currentAcceptedCount = await prisma.member.count({
      where: {
        workspaceId: member.workspaceId,
        deletedAt: null,
        status: InvitationStatus.ACCEPTED,
      },
    });

    const isAllowed = await canAddWorkspaceMembers(member.workspaceId, currentAcceptedCount + 1);
    if (!isAllowed) {
      return res.status(403).json({
        error: {
          msg: 'LIMIT_REACHED',
          details:
            'Você atingiu o limite de membros do seu plano. Faça um upgrade para aceitar mais pessoas.',
        },
      });
    }

    await prisma.member.update({
      where: { id: member.id },
      data: { status: InvitationStatus.ACCEPTED, joinedAt: new Date() },
    });

    res.status(200).json({ data: { updatedAt: new Date() } });
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
