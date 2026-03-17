import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const [userCount, workspaceCount, paymentCount] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.workspace.count({ where: { deletedAt: null } }),
        prisma.customerPayment.count({ where: { deletedAt: null } }),
      ]);

      res.status(200).json({
        data: {
          users: userCount,
          workspaces: workspaceCount,
          payments: paymentCount,
          uptime: process.uptime(),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to fetch stats' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
