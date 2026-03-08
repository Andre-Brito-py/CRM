import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  // Double check role from DB for security
  const user = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { role: true },
  });

  if (!user || user.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  if (req.method === 'GET') {
    try {
      const [userCount, workspaceCount, paymentCount] = await Promise.all([
        prisma.user.count(),
        prisma.workspace.count(),
        prisma.customerPayment.count(),
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
