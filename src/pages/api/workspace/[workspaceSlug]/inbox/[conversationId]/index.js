import { validateSession } from '@/config/api-validation';
import { getConversation, createMessage, updateConversation } from '@/prisma/services/conversation';
import { getWorkspace } from '@/prisma/services/workspace';
import { sendWhatsAppMessage } from '@/lib/server/whatsapp';

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
        
        if (conversation.workspaceId !== workspace.id) {
            return res.status(403).json({ error: { msg: 'Access denied' } });
        }

        res.status(200).json({ data: { conversation } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to fetch conversation' } });
      }
      break;

    case 'PUT':
      try {
        const { assigneeId } = req.body;
        
        const conversation = await getConversation(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: { msg: 'Conversation not found' } });
        }
        
        if (conversation.workspaceId !== workspace.id) {
            return res.status(403).json({ error: { msg: 'Access denied' } });
        }

        const updated = await updateConversation(conversationId, { assigneeId });
        res.status(200).json({ data: { conversation: updated } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to update conversation' } });
      }
      break;

    case 'POST':
      try {
        const { direction, type, content, mediaUrl, status, externalId } = req.body;

        // 1. Fetch conversation to check platform and get contact phone
        const conversation = await getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: { msg: 'Conversation not found' } });
        }

        if (conversation.workspaceId !== workspace.id) {
          return res.status(403).json({ error: { msg: 'Access denied' } });
        }

        let sentMessageId = externalId;
        let messageStatus = status || 'SENT';

        // 2. If outbound WhatsApp message, send via API
        if ((!direction || direction === 'OUTBOUND') && conversation.platform === 'WHATSAPP') {
          try {
            const contactPhone = conversation.contact?.phone;
            if (!contactPhone) {
              throw new Error('Contact phone number missing');
            }

            // Only send if it's a real user message (not system)
            sentMessageId = await sendWhatsAppMessage(workspace.id, contactPhone, content);
            messageStatus = 'SENT';
          } catch (waError) {
            console.error('Failed to send WhatsApp message:', waError);
            messageStatus = 'FAILED';
            // We continue to save the message as FAILED
          }
        }

        const message = await createMessage(conversationId, {
          direction: direction || 'OUTBOUND',
          type: type || 'TEXT',
          content,
          mediaUrl,
          status: messageStatus,
          externalId: sentMessageId
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
