import slugify from 'slugify';

import {
  validateCreateWorkspace,
  validateSession,
} from '@/config/api-validation/index';
import { createWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'POST') {
    const session = await validateSession(req, res);
    console.log('API Workspace Session User:', session.user);
    await validateCreateWorkspace(req, res);
    const { name } = req.body;
    let slug = slugify(name.toLowerCase());
    try {
      await createWorkspace(session.user.id, session.user.email, name, slug);
      res.status(200).json({ data: { name, slug } });
    } catch (error) {
      console.error('Failed to create workspace:', error);
      res.status(400).json({ errors: { error: { msg: error.message || 'Error creating workspace' } } });
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
