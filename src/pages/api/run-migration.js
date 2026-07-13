import prisma from '@/prisma/index';

export default async function handler(req, res) {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: { slug: 'work-space', deletedAt: null },
    });

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace work-space not found' });
    }

    const emailToInsert1 = 'admin@vysify.com';
    const emailToInsert2 = 'admin@closify.com';

    // 1. Check if user 1 exists
    const user1 = await prisma.user.findUnique({ where: { email: emailToInsert1 } });
    let member1 = null;
    if (user1) {
      member1 = await prisma.member.upsert({
        where: {
          workspaceId_email: {
            workspaceId: workspace.id,
            email: emailToInsert1,
          },
        },
        update: {
          deletedAt: null,
          status: 'ACCEPTED',
          teamRole: 'OWNER',
        },
        create: {
          workspaceId: workspace.id,
          email: emailToInsert1,
          inviter: emailToInsert1,
          status: 'ACCEPTED',
          teamRole: 'OWNER',
        },
      });
    }

    // 2. Check if user 2 exists
    const user2 = await prisma.user.findUnique({ where: { email: emailToInsert2 } });
    let member2 = null;
    if (user2) {
      member2 = await prisma.member.upsert({
        where: {
          workspaceId_email: {
            workspaceId: workspace.id,
            email: emailToInsert2,
          },
        },
        update: {
          deletedAt: null,
          status: 'ACCEPTED',
          teamRole: 'OWNER',
        },
        create: {
          workspaceId: workspace.id,
          email: emailToInsert2,
          inviter: emailToInsert2,
          status: 'ACCEPTED',
          teamRole: 'OWNER',
        },
      });
    }

    return res.status(200).json({
      success: true,
      msg: 'Migration ran successfully',
      member1,
      member2,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack,
    });
  }
}
