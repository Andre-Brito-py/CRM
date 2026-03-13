import { validateSession } from '@/config/api-validation';
import { getConversation, createMessage, updateConversation } from '@/prisma/services/conversation';
import { getWorkspace } from '@/prisma/services/workspace';
import { sendWhatsAppMessage } from '@/lib/server/whatsapp';
import { renderTemplateString } from '@/prisma/services/template';
import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, conversationId } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
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
        log({ level: 'error', msg: 'conversation_get_failed', requestId, workspaceId: workspace.id, conversationId, error });
        reportError(error, { route: '/api/workspace/[workspaceSlug]/inbox/[conversationId]', requestId, workspaceId: workspace.id, conversationId });
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
        log({ level: 'error', msg: 'conversation_update_failed', requestId, workspaceId: workspace.id, conversationId, error });
        reportError(error, { route: '/api/workspace/[workspaceSlug]/inbox/[conversationId]', requestId, workspaceId: workspace.id, conversationId });
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
        let resolvedContent = content;

        if (typeof resolvedContent === 'string' && resolvedContent.includes('{{')) {
          resolvedContent = await renderTemplateString(workspace.id, resolvedContent, {
            conversationId: conversation.id,
            contact: conversation.contact,
            contactId: conversation.contactId,
            dealId: req.body?.dealId || null,
          });
        }

        // 2. If outbound WhatsApp message, send via API
        if ((!direction || direction === 'OUTBOUND') && conversation.platform === 'WHATSAPP') {
          try {
            const contactPhone = conversation.contact?.phone;
            if (!contactPhone) {
              throw new Error('Contact phone number missing');
            }

            let { integrationId } = req.body;
            if (!integrationId) {
              const defaultIntegration = await prisma.integration.findFirst({
                where: { workspaceId: workspace.id, provider: 'WHATSAPP', enabled: true }
              });
              if (!defaultIntegration) {
                return res.status(400).json({ error: { msg: 'No active WhatsApp integration found.' } });
              }
              integrationId = defaultIntegration.id;
            }

            // Only send if it's a real user message (not system)
            sentMessageId = await sendWhatsAppMessage(integrationId, contactPhone, resolvedContent);
            messageStatus = 'SENT';
          } catch (waError) {
            log({ level: 'error', msg: 'whatsapp_send_failed', requestId, workspaceId: workspace.id, conversationId, error: waError });
            reportError(waError, { route: 'whatsapp:send', requestId, workspaceId: workspace.id, conversationId });
            messageStatus = 'FAILED';
            // We continue to save the message as FAILED
          }
        }

        const message = await createMessage(conversationId, {
          direction: direction || 'OUTBOUND',
          type: type || 'TEXT',
          content: resolvedContent,
          mediaUrl,
          status: messageStatus,
          externalId: sentMessageId
        });

        res.status(201).json({ data: { message } });
      } catch (error) {
        log({ level: 'error', msg: 'message_create_failed', requestId, workspaceId: workspace.id, conversationId, error });
        reportError(error, { route: '/api/workspace/[workspaceSlug]/inbox/[conversationId]', requestId, workspaceId: workspace.id, conversationId });
        res.status(500).json({ error: { msg: 'Unable to send message' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
