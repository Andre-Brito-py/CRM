import { InvitationStatus, TeamRole } from '@prisma/client';
import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { canAddWorkspaceMembers } from '@/lib/server/subscription';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'POST') {
    const session = await validateSession(req, res);
    const { workspaceCode } = req.body;
    if (!session) return;

    const normalizedCode = String(workspaceCode || '').trim();
    if (!normalizedCode) {
      return res.status(400).json({ errors: { error: { msg: 'workspaceCode is required' } } });
    }

    const workspace = await prisma.workspace.findFirst({
      where: { workspaceCode: normalizedCode, deletedAt: null },
      select: {
        id: true,
        creator: { select: { email: true } },
      },
    });

    if (!workspace?.id) {
      return res.status(404).json({ errors: { error: { msg: 'Unable to find workspace' } } });
    }

    const existing = await prisma.member.findFirst({
      where: {
        workspaceId: workspace.id,
        email: session.user.email,
        deletedAt: null,
      },
      select: { id: true, status: true },
    });

    if (existing?.status === InvitationStatus.ACCEPTED) {
      return res.status(422).json({ errors: { error: { msg: 'Already a member' } } });
    }

    const currentAcceptedCount = await prisma.member.count({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        status: InvitationStatus.ACCEPTED,
      },
    });

    const isAllowed = await canAddWorkspaceMembers(
      workspace.id,
      currentAcceptedCount + (existing ? 1 : 1)
    );

    if (!isAllowed) {
      return res.status(403).json({
        error: {
          msg: 'LIMIT_REACHED',
          details:
            'Você atingiu o limite de membros do seu plano. Faça um upgrade para adicionar mais pessoas.',
        },
      });
    }

    const joinedAt = new Date();

    if (existing) {
      await prisma.member.update({
        where: { id: existing.id },
        data: { status: InvitationStatus.ACCEPTED, joinedAt },
      });
    } else {
      await prisma.member.create({
        data: {
          workspaceId: workspace.id,
          email: session.user.email,
          inviter: workspace.creator?.email || session.user.email,
          status: InvitationStatus.ACCEPTED,
          teamRole: TeamRole.MEMBER,
          joinedAt,
        },
      });
    }

    res.status(200).json({ data: { joinedAt } });
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
