import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';

export const requireSuperAdmin = async (req, res) => {
  const session = await getServerSession(req, res, authOptions);
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

