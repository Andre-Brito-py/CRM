import prisma from '@/prisma/index';
import { sendWhatsAppMessage } from '@/lib/server/whatsapp';
import { createMessage, createConversation } from '@/prisma/services/conversation';

export const getAutomationRules = async (workspaceId) => {
  return await prisma.automationRule.findMany({
    where: { workspaceId },
  });
};

export const createAutomationRule = async (workspaceId, data) => {
  return await prisma.automationRule.create({
    data: {
      workspaceId,
      ...data,
    },
  });
};

export const deleteAutomationRule = async (id, workspaceId) => {
  return await prisma.automationRule.deleteMany({
    where: { id, workspaceId }
  });
};

export const processAutomation = async (workspaceId, eventType, eventData) => {
  console.log(`Processing automation for workspace ${workspaceId}, event ${eventType}`);

  // 1. Fetch active rules for this workspace and event type
  const rules = await prisma.automationRule.findMany({
    where: {
      workspaceId,
      triggerType: eventType,
      isActive: true,
    },
  });

  console.log(`Found ${rules.length} rules`);

  for (const rule of rules) {
    try {
      await executeRule(rule, eventData);
    } catch (error) {
      console.error(`Error executing rule ${rule.id}:`, error);
    }
  }
};

export const processInactivityAutomation = async (workspaceId) => {
  console.log(`Processing inactivity automation for workspace ${workspaceId}`);

  // 1. Fetch active rules for this workspace with triggerType = 'NO_RESPONSE'
  const rules = await prisma.automationRule.findMany({
    where: {
      workspaceId,
      triggerType: 'NO_RESPONSE',
      isActive: true,
    },
  });

  if (rules.length === 0) return;

  console.log(`Found ${rules.length} inactivity rules`);

  for (const rule of rules) {
    try {
      await executeInactivityRule(rule);
    } catch (error) {
      console.error(`Error executing inactivity rule ${rule.id}:`, error);
    }
  }
};

export const processGlobalInactivityAutomation = async () => {
  console.log('Processing global inactivity automation');

  const rules = await prisma.automationRule.findMany({
    where: {
      triggerType: 'NO_RESPONSE',
      isActive: true,
    },
  });

  if (rules.length === 0) return;

  console.log(`Found ${rules.length} inactivity rules across all workspaces`);

  for (const rule of rules) {
    try {
      await executeInactivityRule(rule);
    } catch (error) {
      console.error(`Error executing inactivity rule ${rule.id}:`, error);
    }
  }
};

const executeInactivityRule = async (rule) => {
  const { triggerConfig, workspaceId } = rule;
  const days = triggerConfig?.days || 1;
  // const excludeResolved = triggerConfig?.excludeResolved !== false; 

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Find conversations where:
  // 1. Last updated < cutoffDate
  // 2. We fetch the last message to check direction
  const conversations = await prisma.conversation.findMany({
    where: {
      workspaceId,
      updatedAt: {
        lt: cutoffDate,
      },
    },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      contact: true,
    },
  });

  console.log(`Checking ${conversations.length} potential conversations for inactivity...`);

  for (const conversation of conversations) {
    const lastMessage = conversation.messages[0];

    // If no messages, skip (can't determine direction)
    if (!lastMessage) continue;

    // Check if last message was OUTBOUND
    // If it was OUTBOUND, it means we are waiting for a reply.
    // If it was INBOUND, it means THEY are waiting for US (or we just haven't replied yet, but "No Response" usually implies client didn't respond to us).
    // The requirement: "quando o cliente não respoder em x dias" => "When client doesn't respond".
    // This implies we sent something, and they didn't reply.
    if (lastMessage.direction === 'OUTBOUND') {
      console.log(`Triggering inactivity rule for conversation ${conversation.id}`);

      // Prepare eventData
      // We need to pass conversation so the action can use it
      const eventData = {
        conversation,
        contact: conversation.contact,
        contactId: conversation.contactId,
        // message: lastMessage // Optional context
      };

      await executeRule(rule, eventData);
    }
  }
};

const executeRule = async (rule, eventData) => {
  const { triggerConfig, actionType, actionConfig } = rule;

  // 1. Check Trigger Conditions
  if (!checkTriggerConditions(triggerConfig, eventData)) {
    return;
  }

  // 2. Execute Action
  switch (actionType) {
    case 'SEND_WHATSAPP':
      await executeSendWhatsAppAction(rule.workspaceId, actionConfig, eventData);
      break;
    case 'ASSIGN_TO_USER':
      await executeAssignToUserAction(rule.workspaceId, actionConfig, eventData);
      break;
    default:
      console.warn(`Unknown action type: ${actionType}`);
  }
};

const checkTriggerConditions = (triggerConfig, eventData) => {
  if (!triggerConfig) return true;

  // Check if deal moved to a specific stage
  if (triggerConfig.stageId && eventData.stageId) {
    if (eventData.stageId !== triggerConfig.stageId) {
      return false;
    }
  }

  // Check message content for keywords (INCOMING_MESSAGE)
  if (triggerConfig.keywords && eventData.message) {
    const messageContent = eventData.message.content?.toLowerCase() || '';
    const keywords = triggerConfig.keywords.toLowerCase().split(',').map(k => k.trim());
    const hasKeyword = keywords.some(k => messageContent.includes(k));
    if (!hasKeyword) return false;
  }

  return true;
};

const replaceVariables = (content, eventData) => {
  let result = content;
  if (eventData.contact) {
    result = result.replace(/{{contact.name}}/g, eventData.contact.name || '');
    result = result.replace(/{{contact.firstName}}/g, (eventData.contact.name || '').split(' ')[0]);
    result = result.replace(/{{contact.phone}}/g, eventData.contact.phone || '');
  }
  if (eventData.name) { // Deal name
    result = result.replace(/{{deal.name}}/g, eventData.name);
  }
  // Add more variables as needed
  return result;
};

const executeAssignToUserAction = async (workspaceId, actionConfig, eventData) => {
  const { userId } = actionConfig;
  let conversationId = eventData.conversation?.id;

  // If we don't have a conversation ID directly (e.g. from Deal event), try to find one via contact
  if (!conversationId && eventData.contactId) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId,
        contactId: eventData.contactId,
        // Optionally filtering by open status or platform if needed
      },
      orderBy: { updatedAt: 'desc' }
    });
    conversationId = conversation?.id;
  }

  if (!conversationId || !userId) {
    console.warn('Missing conversationId or userId for assignment action');
    return;
  }

  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { assigneeId: userId },
    });
    console.log(`Assigned conversation ${conversationId} to user ${userId}`);
  } catch (error) {
    console.error('Failed to assign conversation:', error);
  }
};

const executeSendWhatsAppAction = async (workspaceId, actionConfig, eventData) => {
  // We need a contact to send the message to.
  // In a Deal context, eventData should have contactId or we fetch the deal to get it.

  let contactId = eventData.contactId;
  let contactPhone = eventData.contact?.phone;

  // If we don't have phone directly, we might need to fetch it
  if (!contactPhone && contactId) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    contactPhone = contact?.phone;
    // Update eventData for variable replacement
    eventData.contact = contact;
  }

  // If event is INCOMING_MESSAGE, contact is in eventData.contact
  if (!contactPhone && eventData.contact) {
    contactPhone = eventData.contact.phone;
    contactId = eventData.contact.id;
  }

  if (!contactPhone) {
    console.warn('No contact phone found for automation action');
    return;
  }

  let messageContent = actionConfig.message || '';

  // Also check if we need to fetch a template
  if (actionConfig.templateId) {
    const template = await prisma.messageTemplate.findUnique({ where: { id: actionConfig.templateId } });
    if (template) {
      messageContent = template.content;
    }
  }

  // Replace variables
  messageContent = replaceVariables(messageContent, eventData);

  if (!messageContent) return;

  // Send WhatsApp Message
  try {
    // 1. Check if conversation exists or create one
    let conversation = eventData.conversation;

    if (!conversation) {
      conversation = await prisma.conversation.findFirst({
        where: { workspaceId, contactId },
      });
    }

    if (!conversation) {
      conversation = await createConversation(workspaceId, {
        contactId,
        platform: 'WHATSAPP',
        externalId: contactPhone // Usually we use phone as externalId for WhatsApp
      });
    }

    // 2. Send via WhatsApp API
    const wamid = await sendWhatsAppMessage(workspaceId, contactPhone, messageContent);

    // 3. Log in Database
    await createMessage(conversation.id, {
      direction: 'OUTBOUND',
      type: 'TEXT',
      content: messageContent,
      status: 'SENT',
      externalId: wamid
    });

    console.log(`Automation message sent to ${contactPhone}`);

  } catch (error) {
    console.error('Failed to execute WhatsApp automation:', error);
  }
};
