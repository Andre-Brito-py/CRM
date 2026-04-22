import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';
import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { log, reportError } from '@/lib/server/logger';
import { normalizeWhatsAppNumber } from '@/lib/server/phone';
import { rateLimit } from '@/lib/server/rateLimit';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: 'Method not supported' } });
  }

  // Rate Limiting: 10 requests per minute per workspace
  const { workspaceSlug } = req.query;
  const rl = await rateLimit({ req, key: `start-chat:${workspaceSlug}`, limit: 10, windowMs: 60000 });
  if (!rl.ok) {
    return res.status(429).json({ error: { msg: 'Too many requests. Please wait a minute.' } });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: { msg: 'Unauthorized' } });
  }

  const { phone, templateName, languageCode = 'pt_BR' } = req.body || {};

  if (!phone || !templateName) {
    return res.status(400).json({ error: { msg: 'Phone and templateName are required' } });
  }

  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);
  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found' } });
  }

  try {
    // 1. Get WhatsApp integration
    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId: workspace.id,
        provider: { in: ['WHATSAPP', 'whatsapp'] },
        enabled: true
      }
    });

    if (!integration || !integration.credentials) {
      return res.status(400).json({ error: { msg: 'No active WhatsApp integration found' } });
    }

    const { accessToken, phoneNumberId } = integration.credentials;
    if (!accessToken || !phoneNumberId) {
      return res.status(400).json({ error: { msg: 'Integration credentials incomplete' } });
    }

    // 2. Normalize and find/create contact
    // normalizeWhatsAppNumber handles Brazil's mandatory 9th digit (55DD9NNNNNNNN)
    const { clean: normalizedPhone } = normalizeWhatsAppNumber(phone);
    let contact = await prisma.contact.findFirst({
      where: {
        workspaceId: workspace.id,
        OR: [
          { phone: normalizedPhone },
          { phone: `+${normalizedPhone}` },
          { phone: { endsWith: normalizedPhone.slice(-8) } }
        ]
      }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          name: phone, // Default name is phone number
          phone: normalizedPhone,
        }
      });
    }

    // 3. Find or Create Conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId: workspace.id,
        contactId: contact.id,
        platform: 'WHATSAPP'
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId: workspace.id,
          contactId: contact.id,
          platform: 'WHATSAPP',
          externalId: normalizedPhone
        }
      });
    }

    // 4. Send Template Message via Meta API
    const metaUrl = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;
    const response = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode }
        }
      })
    });

    const metaData = await response.json();
    if (!response.ok) {
      log({ level: 'error', msg: 'meta_api_start_chat_failed', error: metaData, workspaceId: workspace.id });
      return res.status(response.status).json({ 
        error: { 
          msg: 'Failed to send WhatsApp template', 
          details: metaData?.error?.message || 'Check your template name and Meta configuration.' 
        } 
      });
    }

    // 5. Create the outbound message record
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        type: 'TEXT',
        content: `[Template: ${templateName}]`,
        externalId: metaData.messages?.[0]?.id,
        status: 'SENT',
      }
    });

    // 6. Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });

    res.status(200).json({ data: { conversationId: conversation.id, message } });
  } catch (error) {
    log({ level: 'error', msg: 'start_chat_api_failed', workspaceId: workspace.id, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/inbox/start-chat' });
    res.status(500).json({ error: { msg: 'Failed to start conversation' } });
  }
}
