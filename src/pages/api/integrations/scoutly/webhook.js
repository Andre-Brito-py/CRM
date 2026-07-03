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
  const { source, event, preferredChannel, lead } = req.body;
  if (source !== 'scoutly' || event !== 'meeting_booked' || !lead) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD_STRUCTURE' });
  }

  const { companyName, email, phone, score, scoreReason, contactName, personalizedMessage } = lead;

  if (!contactName) {
    return res.status(400).json({ error: 'CONTACT_NAME_REQUIRED' });
  }

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
      name: contactName.trim(),
      email: sanitizedEmail,
      phone: sanitizedPhone,
      companyId: company?.id || null,
      preferredChannel: preferredChannel || 'whatsapp',
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

    // 6. Ingest Deal (Kanban Card) in the first Stage of the first Pipeline
    const pipeline = await prisma.pipeline.findFirst({
      where: { workspaceId, deletedAt: null },
      include: { stages: { where: { deletedAt: null }, orderBy: { order: 'asc' } } }
    });

    if (!pipeline || pipeline.stages.length === 0) {
      return res.status(400).json({ error: 'PIPELINE_NOT_CONFIGURED_ON_WORKSPACE' });
    }

    const defaultStage = pipeline.stages[0];

    const deal = await prisma.deal.create({
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

    // 7. Initialize Closer AI Conversation
    const channelPlatform = String(preferredChannel || 'whatsapp').toUpperCase();
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
          autopilotEnabled: true, // Turn on closer AI
          status: 'OPEN'
        }
      });
    } else {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          autopilotEnabled: true,
          status: 'OPEN'
        }
      });
    }

    // 8. Insert initial message from Lead containing personalized Scoutly message / dossier
    const messageContent = personalizedMessage || `Reunião agendada pelo Scoutly. Canal preferencial: ${preferredChannel}`;
    
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        type: 'TEXT',
        content: messageContent,
        status: 'RECEIVED'
      }
    });

    // 9. Fire automations
    // Event 1: DEAL_CREATED
    await processAutomation(workspaceId, 'DEAL_CREATED', deal);

    // Event 2: INCOMING_MESSAGE (Triggers autopilot/Closer AI to reply in the correct channel)
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

    return res.status(200).json({
      success: true,
      leadId: contact.id,
      dealId: deal.id,
      conversationId: conversation.id
    });
  } catch (error) {
    console.error('[scoutly-webhook-error]:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', details: error.message });
  }
}
