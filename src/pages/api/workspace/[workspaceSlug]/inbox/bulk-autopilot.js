import { withRateLimit } from '@/lib/server/api-wrapper';
import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  const session = await validateSession(req, res);

  if (!session) return;

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  if (method !== 'POST') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

  try {
    const { action, scope, conversationIds } = req.body;

    if (!['enable', 'disable'].includes(action)) {
      return res.status(400).json({ error: { msg: 'Invalid action. Must be enable or disable.' } });
    }

    if (!['all', 'except', 'only'].includes(scope)) {
      return res.status(400).json({ error: { msg: 'Invalid scope. Must be all, except, or only.' } });
    }

    const autopilotEnabled = action === 'enable';

    let filter = { workspaceId: workspace.id };

    if (scope === 'only') {
      if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
        return res.status(400).json({ error: { msg: 'conversationIds list must be provided for only scope.' } });
      }
      filter.id = { in: conversationIds };
    } else if (scope === 'except') {
      if (Array.isArray(conversationIds) && conversationIds.length > 0) {
        filter.id = { notIn: conversationIds };
      }
    }

    const updateResult = await prisma.conversation.updateMany({
      where: filter,
      data: {
        autopilotEnabled: autopilotEnabled
      }
    });

    res.status(200).json({ success: true, count: updateResult.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Unable to update autopilot' } });
  }
};

export default withRateLimit(handler, {
    limit: 60,
    windowMs: 60_000,
    keyPrefix: 'api:workspace:inbox:bulk-autopilot:'
});
