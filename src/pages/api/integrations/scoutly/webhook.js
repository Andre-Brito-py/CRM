import prisma from '@/prisma/index';
import { verifyApiKey } from '@/prisma/services/api-key';
import { isModuleAllowed } from '@/lib/server/subscription';
import { processAutomation } from '@/prisma/services/automation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Authenticate using API Key
  const authHeader = req.headers.authorization || req.headers['x-api-key'] || req.query.token;
  let apiKeyStr = authHeader;
  
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    apiKeyStr = authHeader.substring(7);
  }

  if (!apiKeyStr || typeof apiKeyStr !== 'string') {
    return res.status(401).json({ error: 'UNAUTHORIZED_MISSING_API_KEY' });
  }

  const authResult = await verifyApiKey(apiKeyStr);
  if (!authResult) {
    return res.status(401).json({ error: 'UNAUTHORIZED_INVALID_API_KEY' });
  }

  const { workspaceId } = authResult;

  // 2. Verify subscription/plan module permissions
  const allowed = await isModuleAllowed(workspaceId, 'scoutly_integration');
  if (!allowed) {
    return res.status(403).json({ error: 'SCOUTLY_INTEGRATION_MODULE_DISABLED' });
  }

  // 3. Parse and validate payload
  const { source, event, preferredChannel, channel, messageContent, lead } = req.body;
  if (source !== 'scoutly' || !['meeting_booked', 'outreach_sent'].includes(event) || !lead) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD_STRUCTURE' });
  }

  const { companyName, email, phone, score, scoreReason, contactName, personalizedMessage } = lead;

  const resolvedContactName = String(contactName || '').trim() || String(companyName || 'Lead Sem Nome').trim();

  try {
    // 4. Ingest Company
    let company = null;
    if (companyName) {
      const sanitizedCompanyName = String(companyName).trim();
      company = await prisma.company.findFirst({
        where: { name: sanitizedCompanyName, workspaceId, deletedAt: null }
      });
      if (!company) {
        company = await prisma.company.create({
          data: { name: sanitizedCompanyName, workspaceId }
        });
      }
    }

    // 5. Ingest Contact (upsert matching by email or phone)
    let contact = null;
    const sanitizedEmail = email ? String(email).trim().toLowerCase() : null;
    const sanitizedPhone = phone ? String(phone).trim() : null;

    if (sanitizedEmail || sanitizedPhone) {
      contact = await prisma.contact.findFirst({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            ...(sanitizedEmail ? [{ email: sanitizedEmail }] : []),
            ...(sanitizedPhone ? [{ phone: sanitizedPhone }] : [])
          ]
        }
      });
    }

    const contactData = {
      name: resolvedContactName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      companyId: company?.id || null,
      preferredChannel: preferredChannel || channel || 'whatsapp',
      customFields: {
        score: score || null,
        scoreReason: scoreReason || null,
        personalizedMessage: personalizedMessage || null
      }
    };

    if (contact) {
      // Merge customFields if any
      const existingCustom = typeof contact.customFields === 'object' && contact.customFields ? contact.customFields : {};
      contactData.customFields = {
        ...existingCustom,
        ...contactData.customFields
      };

      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: contactData
      });
    } else {
      contact = await prisma.contact.create({
        data: {
          workspaceId,
          ...contactData
        }
      });
    }

    // 6. Ingest Deal (Kanban Card) - APENAS para meeting_booked
    let deal = null;
    if (event === 'meeting_booked') {
      const pipeline = await prisma.pipeline.findFirst({
        where: { workspaceId, deletedAt: null },
        include: { stages: { where: { deletedAt: null }, orderBy: { order: 'asc' } } }
      });

      if (!pipeline || pipeline.stages.length === 0) {
        return res.status(400).json({ error: 'PIPELINE_NOT_CONFIGURED_ON_WORKSPACE' });
      }

      const defaultStage = pipeline.stages[0];

      deal = await prisma.deal.create({
        data: {
          workspaceId,
          contactId: contact.id,
          companyId: company?.id || null,
          stageId: defaultStage.id,
          name: `${contact.name} - ${company?.name || 'Lead Scoutly'}`,
          priority: (score && score >= 80) ? 'HIGH' : 'MEDIUM',
          customFields: {
            score: score || null,
            scoreReason: scoreReason || null,
            personalizedMessage: personalizedMessage || null
          }
        }
      });
    }

    // 7. Initialize Closer AI Conversation / Outreach Conversation
    const activeChannel = event === 'outreach_sent' ? channel : preferredChannel;
    const channelPlatform = String(activeChannel || 'whatsapp').toUpperCase();
    const externalId = channelPlatform === 'EMAIL' ? sanitizedEmail : sanitizedPhone;

    let conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId,
        contactId: contact.id,
        platform: channelPlatform,
        deletedAt: null
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId,
          contactId: contact.id,
          platform: channelPlatform,
          externalId,
          autopilotEnabled: event === 'meeting_booked', // Apenas liga piloto automático se reunião agendada
          status: 'OPEN'
        }
      });
    } else if (event === 'meeting_booked') {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          autopilotEnabled: true,
          status: 'OPEN'
        }
      });
    }

    // 8. Insert initial message
    const msgContent = event === 'outreach_sent' ? messageContent : (personalizedMessage || `Reunião agendada pelo Scoutly. Canal preferencial: ${preferredChannel}`);
    const direction = event === 'outreach_sent' ? 'OUTBOUND' : 'INBOUND';
    const status = event === 'outreach_sent' ? 'SENT' : 'RECEIVED';

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction,
        type: 'TEXT',
        content: msgContent,
        status
      }
    });

    // 9. Fire automations - APENAS para meeting_booked
    if (event === 'meeting_booked') {
      if (deal) {
        await processAutomation(workspaceId, 'DEAL_CREATED', deal);
      }

      const eventData = {
        contact,
        contactId: contact.id,
        conversation,
        conversationId: conversation.id,
        message,
        messageId: message.id,
        platform: channelPlatform
      };
      
      await processAutomation(workspaceId, 'INCOMING_MESSAGE', eventData);
    }

    return res.status(200).json({
      success: true,
      leadId: contact.id,
      dealId: deal?.id || null,
      conversationId: conversation.id
    });
  } catch (error) {
    console.error('[scoutly-webhook-error]:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', details: error.message });
  }
}
