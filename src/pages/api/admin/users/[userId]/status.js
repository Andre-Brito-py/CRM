import prisma from '@/prisma/index';
import { getServerSession } from 'next-auth/next';
import { getAuthOptions } from '@/lib/server/auth';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, await getAuthOptions());
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  // Security check: Only SUPERADMIN can manage users
  const adminUserId = session.user.userId || session.user.id;
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { role: true },
  });

  if (!admin || admin.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  // Extract userId from query (Next.js route is /api/admin/users/[userId]/status)
  const { userId } = req.query;

  if (req.method === 'PATCH') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        res.status(400).json({ error: { msg: 'Invalid JSON body' } });
        return;
      }
    }
    const { suspended } = body || {};
    if (typeof suspended !== 'boolean') {
      res.status(400).json({ error: { msg: 'Missing suspended boolean' } });
      return;
    }

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
