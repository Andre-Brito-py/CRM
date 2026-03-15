import { InvitationStatus } from '@prisma/client';

import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';

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
      select: { id: true },
    });

    if (!member) {
      return res.status(404).json({ errors: { error: { msg: 'Invitation not found' } } });
    }

    await prisma.member.update({
      where: { id: member.id },
      data: { status: InvitationStatus.DECLINED },
    });
    res.status(200).json({ data: { updatedAt: new Date() } });
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
