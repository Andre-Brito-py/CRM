import { getServerSession } from 'next-auth/next';

import { getAuthOptions } from '@/lib/server/auth';
import { ensureRequestId } from '@/lib/server/request-id';
import prisma from '@/prisma/index';

const validateMiddleware = () => {
  return async (req, res, next) => {
    ensureRequestId(req, res);
    
    // 1. Try Session Authentication (Cookie)
    const session = await getServerSession(req, res, await getAuthOptions(req));

    // 2. Try API Key Authentication (Header)
    let apiSession = null;
    if (!session) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const key = authHeader.split(' ')[1];
        const { verifyApiKey } = await import('@/prisma/services/api-key');
        const validation = await verifyApiKey(key);
        
        if (validation) {
          apiSession = {
            user: validation.user,
            isApi: true,
            workspaceId: validation.workspaceId
          };
        }
      }
    }

    const activeSession = session || apiSession;
    const errors = [];

    if (!activeSession) {
      errors.push({ param: 'session', msg: 'Unauthorized access' });
    } else {
      // Security: Check if user is suspended in the database
      const userId = activeSession.user.id || activeSession.user.userId;
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { suspended: true }
      });

      if (dbUser?.suspended) {
        const errorObject = { msg: 'Your account is suspended', detail: 'Please contact support.' };
        return res.status(401).json({ error: errorObject });
      }

      return next(activeSession);
    }

    const errorObject = {};
    errors.forEach((error) => (errorObject[error.param] = error));
    res.status(401).json({ error: errorObject });
  };
};

export default validateMiddleware;
