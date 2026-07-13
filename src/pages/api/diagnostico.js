import prisma from '@/prisma/index';

export default async function handler(req, res) {
  try {
    const rawDbUrl = process.env.DATABASE_URL || '';
    const maskedDbUrl = rawDbUrl.replace(/:([^:@]+)@/, ':***@');

    const workspaces = await prisma.workspace.findMany({
      select: { id: true, name: true, slug: true }
    });

    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true }
    });

    const members = await prisma.member.findMany({
      select: { id: true, email: true, workspaceId: true }
    });

    return res.status(200).json({
      success: true,
      databaseUrl: maskedDbUrl,
      workspaces,
      users,
      members
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  }
}
