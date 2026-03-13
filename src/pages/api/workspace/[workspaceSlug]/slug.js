import {
  validateUpdateWorkspaceSlug,
  validateSession,
} from '@/config/api-validation/index';
import { getWorkspace, updateSlug } from '@/prisma/services/workspace';
import { createAuditActivity } from '@/prisma/services/activity';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'PUT') {
    const session = await validateSession(req, res);
    let { slug } = req.body;
    await validateUpdateWorkspaceSlug(req, res);
    const workspace = await getWorkspace(session.user.userId, session.user.email, req.query.workspaceSlug);
    updateSlug(
      session.user.userId,
      session.user.email,
      slug,
      req.query.workspaceSlug
    )
      .then(async (slug) => {
        if (workspace?.id) {
          await createAuditActivity(
            workspace.id,
            session.user.userId,
            { action: 'WORKSPACE_UPDATE_SLUG', title: 'Workspace slug updated', metadata: { slug } },
            req
          );
        }
        res.status(200).json({ data: { slug } });
      })
      .catch((error) =>
        res.status(404).json({ errors: { error: { msg: error.message } } })
      );
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
