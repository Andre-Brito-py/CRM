import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const workspaces = await prisma.workspace.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          creator: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: { members: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({ data: { workspaces } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to fetch workspaces' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
