import {
  validateSession,
  validateUpdateWorkspaceName,
} from '@/config/api-validation/index';
import { getWorkspace, updateName } from '@/prisma/services/workspace';
import { createAuditActivity } from '@/prisma/services/activity';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'PUT') {
    const session = await validateSession(req, res);
    await validateUpdateWorkspaceName(req, res);
    const { name } = req.body;
    const workspace = await getWorkspace(session.user.userId, session.user.email, req.query.workspaceSlug);
    updateName(
      session.user.userId,
      session.user.email,
      name,
      req.query.workspaceSlug
    )
      .then(async (name) => {
        if (workspace?.id) {
          await createAuditActivity(
            workspace.id,
            session.user.userId,
            { action: 'WORKSPACE_UPDATE_NAME', title: 'Workspace name updated', metadata: { name } },
            req
          );
        }
        res.status(200).json({ data: { name } });
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
