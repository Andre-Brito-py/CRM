import prisma from '@/prisma/index';
import { processAutomation } from '@/prisma/services/automation';
import { processAutopilotReply } from '@/lib/server/autopilot';
import { normalizeWhatsAppNumber } from '@/lib/server/phone';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body;

  // Evolution API sends connection updates or messages.upsert
  const event = payload?.event || '';
  const instanceName = payload?.instance || '';

  if (!instanceName.startsWith('vysify-')) {
    // Ignore non-Vysify webhooks
    return res.status(200).json({ status: 'ignored_not_vysify_instance' });
  }

  const workspaceId = instanceName.replace('vysify-', '');

  try {
    // 1. Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // 2. Handle connection updates
    if (event === 'connection.update') {
      const state = payload?.data?.state || '';
      console.log(`[evolution-webhook] Connection state for ${instanceName}: ${state}`);
      return res.status(200).json({ status: 'connection_updated' });
    }

    // 3. Handle incoming messages
    if (event === 'messages.upsert') {
      const msgData = payload?.data;
      const key = msgData?.key;
      const messageContent = msgData?.message;

      // Only process incoming messages (ignore self-sent ones)
      if (!key || key.fromMe === true) {
        return res.status(200).json({ status: 'ignored_outbound_message' });
      }

      const remoteJid = key.remoteJid || '';
      const rawPhone = remoteJid.split('@')[0];
      const { clean: cleanPhone } = normalizeWhatsAppNumber(rawPhone);

      // Extract message text content
      let text = '';
      if (messageContent) {
        text = messageContent.conversation || 
               messageContent.extendedTextMessage?.text || 
               messageContent.imageMessage?.caption || 
               messageContent.videoMessage?.caption || 
               '';
      }

      if (!text) {
        return res.status(200).json({ status: 'ignored_empty_message' });
      }

      const pushName = payload?.data?.pushName || 'Contato WhatsApp';

      // Find or create contact
      let contact = await prisma.contact.findFirst({
        where: {
          workspaceId,
          phone: { contains: cleanPhone },
        },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            workspaceId,
            name: pushName,
            phone: cleanPhone,
            preferredChannel: 'whatsapp',
          },
        });
      } else if (!contact.preferredChannel) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { preferredChannel: 'whatsapp' },
        });
      }

      // Find or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          workspaceId,
          contactId: contact.id,
          platform: 'WHATSAPP',
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            workspaceId,
            contactId: contact.id,
            platform: 'WHATSAPP',
            autopilotEnabled: true,
          },
        });
      }

      // Add message
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'INBOUND',
          content: text,
          messageType: 'TEXT',
          externalId: key.id,
        },
      });

      // Execute autopilot in background (non-blocking)
      if (conversation.autopilotEnabled) {
        processAutopilotReply(workspaceId, conversation.id, text).catch((err) => {
          console.error('[evolution-webhook-autopilot-error]', err);
        });
      }

      // Trigger automations (non-blocking)
      processAutomation(workspaceId, 'INCOMING_MESSAGE', {
        platform: 'WHATSAPP',
        contact,
        conversation,
        message,
      }).catch((err) => {
        console.error('[evolution-webhook-automation-error]', err);
      });

      return res.status(200).json({
        success: true,
        messageId: message.id,
        conversationId: conversation.id,
      });
    }

    return res.status(200).json({ status: 'unhandled_event' });
  } catch (error) {
    console.error('[evolution-webhook-error] Failed to process webhook:', error);
    return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
}
