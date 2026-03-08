import { validateSession } from '@/config/api-validation';
import { getConversation, createMessage } from '@/prisma/services/conversation';
import { getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, conversationId } = req.query;
  const session = await validateSession(req, res);

  if (!session) return;

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  switch (method) {
    case 'GET':
      try {
        const conversation = await getConversation(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: { msg: 'Conversation not found' } });
        }
        res.status(200).json({ data: { conversation } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to fetch conversation' } });
      }
      break;

    case 'POST':
      try {
        const { direction, type, content, mediaUrl, status, externalId } = req.body;
        
        const message = await createMessage(conversationId, {
            direction: direction || 'OUTBOUND',
            type: type || 'TEXT',
            content,
            mediaUrl,
            status: status || 'SENT',
            externalId
        });

        res.status(201).json({ data: { message } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to send message' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
