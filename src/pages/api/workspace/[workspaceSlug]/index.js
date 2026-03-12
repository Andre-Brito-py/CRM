import { validateSession } from '@/config/api-validation';
import { deleteWorkspace, getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;

  try {
    const session = await validateSession(req, res);
    if (!session) return;

    if (method === 'GET') {
      const workspace = await getWorkspace(
        session.user.userId || session.user.id,
        session.user.email,
        workspaceSlug
      );

      if (workspace) {
        res.status(200).json({ data: { workspace } });
      } else {
        res.status(404).json({ error: { msg: 'Workspace not found' } });
      }
    } else if (method === 'DELETE') {
      deleteWorkspace(
        session.user.userId || session.user.id,
        session.user.email,
        workspaceSlug
      )
        .then((slug) => res.status(200).json({ data: { slug } }))
        .catch((error) =>
          res.status(404).json({ errors: { error: { msg: error.message } } })
        );
    } else {
      res
        .status(405)
        .json({ errors: { error: { msg: `${method} method unsupported` } } });
    }
  } catch (error) {
    res.status(500).json({ errors: { error: { msg: error.message } } });
  }
};

export default handler;
