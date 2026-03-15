import {
  validateSession,
  validateUpdateWorkspaceAiContext,
} from '@/config/api-validation/index';
import { getWorkspace, updateAiContext } from '@/prisma/services/workspace';
import { createAuditActivity } from '@/prisma/services/activity';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'PUT') {
    const session = await validateSession(req, res);
    await validateUpdateWorkspaceAiContext(req, res);
    const { aiContext } = req.body;
    const workspace = await getWorkspace(session.user.userId, session.user.email, req.query.workspaceSlug);
    updateAiContext(
      session.user.userId,
      session.user.email,
      aiContext,
      req.query.workspaceSlug
    )
      .then(async (context) => {
        if (workspace?.id) {
          await createAuditActivity(
            workspace.id,
            session.user.userId,
            { action: 'WORKSPACE_UPDATE_AI_CONTEXT', title: 'Workspace AI context updated', metadata: { aiContext: context } },
            req
          );
        }
        res.status(200).json({ data: { aiContext: context } });
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
