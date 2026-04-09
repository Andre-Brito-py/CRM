import { getServerSession } from 'next-auth/next';

import { getAuthOptions } from '@/lib/server/auth';
import { ensureRequestId } from '@/lib/server/request-id';
import prisma from '@/prisma/index';

const validateMiddleware = () => {
  return async (req, res, next) => {
    ensureRequestId(req, res);
    const session = await getServerSession(req, res, await getAuthOptions(req));
    const errors = [];

    if (!session) {
      errors.push({ param: 'session', msg: 'Unauthorized access' });
    } else {
      // Security: Check if user is suspended in the database
      const userId = session.user.id || session.user.userId;
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { suspended: true }
      });

      if (dbUser?.suspended) {
        const errorObject = { msg: 'Your account is suspended', detail: 'Please contact support.' };
        return res.status(401).json({ error: errorObject });
      }

      return next(session);
    }

    const errorObject = {};
    errors.forEach((error) => (errorObject[error.param] = error));
    res.status(401).json({ error: errorObject });
  };
};

export default validateMiddleware;
