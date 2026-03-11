import { getSession } from 'next-auth/react';
import { encode } from 'next-auth/jwt';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  // Double check role
  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { role: true },
  });

  if (!adminUser || adminUser.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  const { userId } = req.query;

  if (req.method === 'POST') {
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        res.status(404).json({ error: { msg: 'User not found' } });
        return;
      }

      // Create a new JWT for the target user
      // The payload must match what NextAuth expects
      const token = {
        name: targetUser.name,
        email: targetUser.email,
        picture: targetUser.image,
        sub: targetUser.id,
      };

      const jwt = await encode({
        token,
        secret: process.env.NEXTAUTH_SECRET,
      });

      // Determine cookie name based on environment
      const cookieName = process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token';

      // Set the cookie
      // We use setHeader because we are in an API route
      res.setHeader('Set-Cookie', `${cookieName}=${jwt}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to impersonate user' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
