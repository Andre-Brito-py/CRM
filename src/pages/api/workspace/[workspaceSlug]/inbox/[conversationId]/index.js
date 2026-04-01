import { validateSession } from '@/config/api-validation';
import { getConversation, createMessage, updateConversation } from '@/prisma/services/conversation';
import { getWorkspace } from '@/prisma/services/workspace';
import { sendWhatsAppMessage } from '@/lib/server/whatsapp';
import { sendMail } from '@/lib/server/mail';
import { renderTemplateString } from '@/prisma/services/template';
import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';
import { processAutomation } from '@/prisma/services/automation';

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const extractEmailSubject = (messages = []) => {
  const lastInbound = [...messages].reverse().find((m) => m?.direction === 'INBOUND' && typeof m?.content === 'string');
  const firstLine = String(lastInbound?.content || '').split('\n')[0] || '';
  const m = firstLine.match(/^\s*(assunto|subject)\s*:\s*(.+)\s*$/i);
  if (!m?.[2]) return null;
  return String(m[2]).trim();
};

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, conversationId } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const session = await validateSession(req, res);

  if (!session) return;

  const workspace = await getWorkspace(session.user.userId || session.user.id, session.user.email, workspaceSlug);

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
        const { assigneeId, autopilotEnabled } = req.body || {};

        const conversation = await getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: { msg: 'Conversation not found' } });
        }

        if (conversation.workspaceId !== workspace.id) {
          return res.status(403).json({ error: { msg: 'Access denied' } });
        }

        const data = {};
        if (assigneeId !== undefined) data.assigneeId = assigneeId;
        if (autopilotEnabled !== undefined) {
          if (typeof autopilotEnabled !== 'boolean') {
            return res.status(400).json({ error: { msg: 'Invalid autopilotEnabled value' } });
          }
          data.autopilotEnabled = autopilotEnabled;
        }

        const updated = await updateConversation(conversationId, data);

        if (autopilotEnabled === true && !conversation.autopilotEnabled) {
          processAutomation(workspace.id, 'AUTOPILOT_ENABLED', {
            contact: updated.contact,
            contactId: updated.contactId,
            conversation: updated,
            occurredAt: new Date().toISOString(),
          }).catch((err) => {
            log({
              level: 'error',
              msg: 'automation_autopilot_enabled_failed',
              requestId,
              workspaceId: workspace.id,
              conversationId,
              error: err,
            });
            reportError(err, { route: 'automation:AUTOPILOT_ENABLED', requestId, workspaceId: workspace.id, conversationId });
          });
        }
        res.status(200).json({ data: { conversation: updated } });
      } catch (error) {
        log({ level: 'error', msg: 'conversation_update_failed', requestId, workspaceId: workspace.id, conversationId, error });
        reportError(error, { route: '/api/workspace/[workspaceSlug]/inbox/[conversationId]', requestId, workspaceId: workspace.id, conversationId });
        res.status(500).json({ error: { msg: 'Unable to update conversation' } });
      }
      break;

    case 'POST':
      try {
        const { direction, type, content, mediaUrl, status, externalId, quotedId } = req.body;

        // 1. Fetch conversation to check platform and get contact phone
        const conversation = await getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: { msg: 'Conversation not found' } });
        }

        if (conversation.workspaceId !== workspace.id) {
          return res.status(403).json({ error: { msg: 'Access denied' } });
        }

        let quotedExternalId = null;
        if (quotedId) {
          const qm = await prisma.message.findUnique({ where: { id: quotedId }, select: { externalId: true } });
          quotedExternalId = qm?.externalId || null;
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
              // Detailed logging to help troubleshoot integration issues
              log({ level: 'info', msg: 'searching_whatsapp_integration', requestId, workspaceId: workspace.id, workspaceSlug });

              // Look for any enabled WHATSAPP integration
              const defaultIntegration = await prisma.integration.findFirst({
                where: { 
                  workspaceId: workspace.id, 
                  provider: { in: ['WHATSAPP', 'whatsapp'] }, 
                  enabled: true 
                }
              });

              if (!defaultIntegration) {
                // Check if any exists but is disabled
                const anyIntegration = await prisma.integration.findFirst({
                  where: { 
                    workspaceId: workspace.id, 
                    provider: { in: ['WHATSAPP', 'whatsapp'] }
                  }
                });

                if (anyIntegration) {
                  log({ level: 'warn', msg: 'whatsapp_integration_disabled', requestId, workspaceId: workspace.id });
                  return res.status(400).json({ error: { msg: 'Sua integração com o WhatsApp está desativada. Ative-a nas configurações.' } });
                }

                log({ level: 'error', msg: 'no_whatsapp_integration_found', requestId, workspaceId: workspace.id });
                return res.status(400).json({ error: { msg: 'Nenhuma integração com o WhatsApp foi encontrada para este workspace.' } });
              }
              integrationId = defaultIntegration.id;
            }

            // Only send if it's a real user message (not system)
            sentMessageId = await sendWhatsAppMessage(integrationId, contactPhone, resolvedContent, { quotedId: quotedExternalId });
            messageStatus = 'SENT';
          } catch (waError) {
            log({ level: 'error', msg: 'whatsapp_send_failed', requestId, workspaceId: workspace.id, conversationId, error: waError });
            reportError(waError, { route: 'whatsapp:send', requestId, workspaceId: workspace.id, conversationId });
            messageStatus = 'FAILED';
            // We continue to save the message as FAILED
          }
        }

        if ((!direction || direction === 'OUTBOUND') && conversation.platform === 'EMAIL') {
          try {
            const contactEmail = conversation.contact?.email;
            if (!contactEmail) {
              throw new Error('Contact email missing');
            }

            const emailIntegration = await prisma.integration.findFirst({
              where: { workspaceId: workspace.id, provider: 'EMAIL', enabled: true },
              select: { id: true },
            });
            if (!emailIntegration) {
              throw new Error('No active Email integration found.');
            }

            const baseSubject = extractEmailSubject(conversation.messages) || `Conversa com ${conversation.contact?.name || contactEmail}`;
            const subject = /^re\s*:/i.test(baseSubject) ? baseSubject : `Re: ${baseSubject}`;
            const lastInboundMessageId = [...(conversation.messages || [])].reverse().find((m) => m?.direction === 'INBOUND' && m?.externalId)?.externalId || null;

            const html = `<div style="white-space:pre-wrap">${escapeHtml(resolvedContent)}</div>`;
            const info = await sendMail({
              to: contactEmail,
              subject,
              text: resolvedContent,
              html,
              headers: lastInboundMessageId ? { 'In-Reply-To': String(lastInboundMessageId), References: String(lastInboundMessageId) } : undefined,
            });

            sentMessageId = info?.messageId ? String(info.messageId) : sentMessageId;
            messageStatus = 'SENT';
          } catch (mailError) {
            log({ level: 'error', msg: 'email_send_failed', requestId, workspaceId: workspace.id, conversationId, error: mailError });
            reportError(mailError, { route: 'email:send', requestId, workspaceId: workspace.id, conversationId });
            messageStatus = 'FAILED';
          }
        }

        if ((!direction || direction === 'OUTBOUND') && conversation.platform === 'INSTAGRAM') {
          try {
            const contactId = conversation.externalId || (conversation.contact?.customFields?.instagramId);
            if (!contactId) {
              throw new Error('Contact Instagram ID missing');
            }

            let { integrationId } = req.body;
            if (!integrationId) {
              const defaultIntegration = await prisma.integration.findFirst({
                where: { workspaceId: workspace.id, provider: 'INSTAGRAM', enabled: true }
              });
              if (!defaultIntegration) {
                return res.status(400).json({ error: { msg: 'No active Instagram integration found.' } });
              }
              integrationId = defaultIntegration.id;
            }

            const { sendInstagramMessage } = await import('@/lib/server/instagram');
            sentMessageId = await sendInstagramMessage(integrationId, contactId, resolvedContent, { quotedId: quotedExternalId });
            messageStatus = 'SENT';
          } catch (igError) {
            log({ level: 'error', msg: 'instagram_send_failed', requestId, workspaceId: workspace.id, conversationId, error: igError });
            reportError(igError, { route: 'instagram:send', requestId, workspaceId: workspace.id, conversationId });
            messageStatus = 'FAILED';
          }
        }

        const message = await createMessage(conversationId, {
          direction: direction || 'OUTBOUND',
          type: type || 'TEXT',
          content: resolvedContent,
          mediaUrl,
          status: messageStatus,
          externalId: sentMessageId,
          quotedMessageId: quotedId
        });

        if ((direction || 'OUTBOUND') === 'OUTBOUND' && conversation.platform === 'EMAIL' && messageStatus === 'SENT') {
          processAutomation(workspace.id, 'EMAIL_SENT', {
            contact: conversation.contact,
            contactId: conversation.contactId,
            conversation,
            message,
            occurredAt: new Date().toISOString(),
          }).catch((err) => {
            log({
              level: 'error',
              msg: 'automation_email_sent_failed',
              requestId,
              workspaceId: workspace.id,
              conversationId,
              messageId: message?.id || null,
              error: err,
            });
            reportError(err, { route: 'automation:EMAIL_SENT', requestId, workspaceId: workspace.id, conversationId, messageId: message?.id || null });
          });
        }

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
