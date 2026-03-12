import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/server/auth';
import { ensureRequestId } from '@/lib/server/request-id';

const validateMiddleware = () => {
  return async (req, res, next) => {
    ensureRequestId(req, res);
    const session = await getServerSession(req, res, authOptions);
    const errors = [];

    if (!session) {
      errors.push({ param: 'session', msg: 'Unauthorized access' });
    } else {
      return next(session);
    }

    const errorObject = {};
    errors.forEach((error) => (errorObject[error.param] = error));
    res.status(401).json({ errors: errorObject });
  };
};

export default validateMiddleware;
