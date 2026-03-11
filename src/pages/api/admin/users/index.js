import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const where = session?.user?.userId
    ? { id: session.user.userId }
    : session?.user?.email
      ? { email: session.user.email }
      : null;

  if (!where) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const user = await prisma.user.findUnique({ where, select: { role: true } });

  if (!user || user.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          suspended: true,
          deletedAt: true,
          customerPayment: {
            select: { subscriptionType: true },
          },
          _count: {
            select: { createdWorkspace: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({ data: { users } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to fetch users' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
