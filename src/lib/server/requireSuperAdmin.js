import { getServerSession } from 'next-auth/next';
import { getAuthOptions } from '@/lib/server/auth';
import { ensureRequestId } from '@/lib/server/request-id';
import prisma from '@/prisma/index';

export const requireSuperAdmin = async (req, res) => {
  ensureRequestId(req, res);
  const session = await getServerSession(req, res, await getAuthOptions());
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return null;
  }
  const userId = session?.user?.userId || session?.user?.id || null;
  if (!userId) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return null;
  }

  const require2fa = (() => {
    const raw = String(process.env.SUPERADMIN_REQUIRE_2FA ?? '').trim().toLowerCase();
    if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') return true;
    if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') return false;
    return process.env.NODE_ENV === 'production';
  })();

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, twoFactorEnabled: true },
  });

  if (!dbUser || dbUser.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return null;
  }

  if (require2fa && !dbUser.twoFactorEnabled) {
    res.status(403).json({ error: { msg: '2FA_REQUIRED' } });
    return null;
  }

  session.user.role = 'SUPERADMIN';
  session.user.twoFactorEnabled = Boolean(dbUser.twoFactorEnabled);
  return session;
};
