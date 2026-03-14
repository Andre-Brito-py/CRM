import crypto from 'crypto';
import { getSession } from 'next-auth/react';
import { encode } from 'next-auth/jwt';
import prisma from '@/prisma/index';
import { createPlatformAuditActivity } from '@/prisma/services/activity';

const parseImpersonationCookie = (raw, secret) => {
  const value = String(raw || '').trim();
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length < 3) return null;
  const adminId = parts[0];
  const issuedAt = Number(parts[1]);
  const sig = parts.slice(2).join('.');
  if (!adminId || !Number.isFinite(issuedAt) || !sig) return null;
  const payload = `${adminId}.${issuedAt}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (expected !== sig) return null;
  return { adminId, issuedAt };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: 'Method not supported' } });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return res.status(500).json({ error: { msg: 'NEXTAUTH_SECRET not configured' } });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: { msg: 'Unauthorized' } });
  }

  const parsed = parseImpersonationCookie(req.cookies?.closify_impersonation, secret);
  if (!parsed) {
    return res.status(400).json({ error: { msg: 'Not impersonating' } });
  }

  const maxAgeMs = 8 * 60 * 60 * 1000;
  if (Date.now() - parsed.issuedAt > maxAgeMs) {
    return res.status(400).json({ error: { msg: 'Impersonation expired' } });
  }

  const admin = await prisma.user.findUnique({
    where: { id: parsed.adminId },
    select: { id: true, name: true, email: true, image: true, role: true },
  });
  if (!admin || admin.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  const token = {
    name: admin.name,
    email: admin.email,
    picture: admin.image,
    sub: admin.id,
  };

  const jwt = await encode({ token, secret });

  const cookieName = process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  res.setHeader('Set-Cookie', [
    `${cookieName}=${jwt}; Path=/; HttpOnly; SameSite=Lax${secure}`,
    `closify_impersonation=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
    `closify_impersonating=; Path=/; Max-Age=0; SameSite=Lax${secure}`,
  ]);

  await createPlatformAuditActivity(
    admin.id,
    admin.email,
    {
      action: 'IMPERSONATE_STOP',
      title: 'Masquerade stopped',
      target: { userId: session.user.userId || session.user.id },
      metadata: { email: session.user.email || null },
    },
    req
  );

  return res.status(200).json({ success: true });
}

