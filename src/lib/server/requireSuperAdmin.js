import { getServerSession } from 'next-auth/next';
import { getAuthOptions } from '@/lib/server/auth';
import { ensureRequestId } from '@/lib/server/request-id';

export const requireSuperAdmin = async (req, res) => {
  ensureRequestId(req, res);
  const session = await getServerSession(req, res, await getAuthOptions());
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return null;
  }
  if (session?.user?.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return null;
  }
  return session;
};
