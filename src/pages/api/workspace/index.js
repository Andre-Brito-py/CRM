import slugify from 'slugify';

import {
  validateCreateWorkspace,
  validateSession,
} from '@/config/api-validation/index';
import { createWorkspace } from '@/prisma/services/workspace';
import { ensureRequestId } from '@/lib/server/request-id';
import { log, reportError } from '@/lib/server/logger';

const handler = async (req, res) => {
  const requestId = ensureRequestId(req, res);
  const { method } = req;

  if (method === 'POST') {
    const session = await validateSession(req, res);
    await validateCreateWorkspace(req, res);
    const { name } = req.body;
    let slug = slugify(name.toLowerCase());
    try {
      await createWorkspace(session.user.id, session.user.email, name, slug);
      res.status(200).json({ data: { name, slug } });
    } catch (error) {
      log({
        level: 'error',
        msg: 'failed to create workspace',
        requestId,
        userId: session?.user?.id,
        err: error,
      });
      reportError(error, { requestId, route: 'workspace/index', userId: session?.user?.id });
      res.status(400).json({ errors: { error: { msg: error.message || 'Error creating workspace' } } });
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
