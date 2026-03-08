import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  // Security check: Only SUPERADMIN can manage users
  const admin = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { role: true },
  });

  if (!admin || admin.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  // Extract userId from query (Next.js route is /api/admin/users/[userId]/status)
  const { userId } = req.query;

  if (req.method === 'PATCH') {
    const { suspended } = req.body;

    try {
      // Prevent suspending another SUPERADMIN
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (targetUser?.role === 'SUPERADMIN') {
        res.status(400).json({ error: { msg: 'Cannot suspend a Super Admin' } });
        return;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { suspended },
      });

      res.status(200).json({ data: { user } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to update user status' } });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Prevent deleting another SUPERADMIN
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (targetUser?.role === 'SUPERADMIN') {
        res.status(400).json({ error: { msg: 'Cannot delete a Super Admin' } });
        return;
      }

      // Soft delete
      const user = await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });

      res.status(200).json({ data: { user } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to delete user' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
