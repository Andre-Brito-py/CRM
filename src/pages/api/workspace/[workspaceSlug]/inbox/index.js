import { withRateLimit } from '@/lib/server/api-wrapper';
import { validateSession } from '@/config/api-validation';
import { getConversations, createConversation } from '@/prisma/services/conversation';
import { getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  const session = await validateSession(req, res);

  if (!session) return;

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  switch (method) {
    case 'GET':
      try {
        const parsePositiveInt = (v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) return null;
          return Math.floor(n);
        };

        const { assigneeId, status, search, page, pageSize } = req.query;
        const filters = {};
        if (assigneeId) filters.assigneeId = assigneeId;
        if (status) filters.status = status;
        if (search) filters.search = search;

        const options = {
          page: parsePositiveInt(page) || 1,
          pageSize: parsePositiveInt(pageSize) || 50,
        };

        const { conversations, meta } = await getConversations(workspace.id, filters, options);
        res.status(200).json({ data: { conversations, meta } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to fetch conversations' } });
      }
      break;

    case 'POST':
      try {
        const { contactId, platform, externalId } = req.body;
        const conversation = await createConversation(workspace.id, { contactId, platform, externalId });
        res.status(201).json({ data: { conversation } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to create conversation' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default withRateLimit(handler, {
    limit: 120, // Higher limit for inbox as it refreshes often
    windowMs: 60_000,
    keyPrefix: 'api:workspace:inbox:'
});
