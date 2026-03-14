import { getSession } from 'next-auth/react';
import { encode } from 'next-auth/jwt';
import crypto from 'crypto';
import prisma from '@/prisma/index';
import { createPlatformAuditActivity } from '@/prisma/services/activity';

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
      const secret = process.env.NEXTAUTH_SECRET;
      if (!secret) {
        return res.status(500).json({ error: { msg: 'NEXTAUTH_SECRET not configured' } });
      }

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
        secret,
      });

      // Determine cookie name based on environment
      const cookieName = process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token';

      const issuedAt = Date.now();
      const cookiePayload = `${session.user.userId}.${issuedAt}`;
      const sig = crypto.createHmac('sha256', secret).update(cookiePayload).digest('hex');
      const impersonationToken = `${cookiePayload}.${sig}`;
      const maxAgeSeconds = 60 * 60 * 8;

      // Set the cookie
      // We use setHeader because we are in an API route
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
      res.setHeader('Set-Cookie', [
        `${cookieName}=${jwt}; Path=/; HttpOnly; SameSite=Lax${secure}`,
        `closify_impersonation=${impersonationToken}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${secure}`,
        `closify_impersonating=1; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`,
      ]);

      await createPlatformAuditActivity(
        session.user.userId || session.user.id,
        session.user.email,
        {
          action: 'IMPERSONATE_START',
          title: 'Masquerade started',
          target: { userId: targetUser.id },
          metadata: { email: targetUser.email || null },
        },
        req
      );

      res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to impersonate user' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
