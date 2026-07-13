import prisma from '@/prisma/index';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  try {
    const session = await getSession({ req });
    const rawDbUrl = process.env.DATABASE_URL || '';
    const maskedDbUrl = rawDbUrl.replace(/:([^:@]+)@/, ':***@');

    const workspaces = await prisma.workspace.findMany({
      select: { id: true, name: true, slug: true, deletedAt: true }
    });

    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true }
    });

    const members = await prisma.member.findMany({
      select: { id: true, email: true, workspaceId: true, deletedAt: true, role: true }
    });

    return res.status(200).json({
      success: true,
      session: session ? {
        user: session.user
      } : null,
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

