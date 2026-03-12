import prisma from '@/prisma/index';
import { sendWhatsAppMessage } from '@/lib/server/whatsapp';
import { createMessage, createConversation } from '@/prisma/services/conversation';
import { createActivity } from '@/prisma/services/activity';
import { renderTemplateString } from '@/prisma/services/template';
import crypto from 'crypto';

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

export const processSlaBreachAutomations = async () => {
  console.log('Processing global SLA breaches');

  // Find all active SLA_BREACH rules
  const rules = await prisma.automationRule.findMany({
    where: {
      triggerType: 'SLA_BREACH',
      isActive: true,
    },
  });

  if (rules.length === 0) return;

  console.log(`Found ${rules.length} SLA rules across workspaces`);

  for (const rule of rules) {
    try {
      const { triggerConfig, workspaceId } = rule;
      // Default SLA limit is 15 minutes if not specified
      const minutes = triggerConfig?.minutes || 15;
      
      const cutoffDate = new Date();
      cutoffDate.setMinutes(cutoffDate.getMinutes() - minutes);

      // Find Open/Pending conversations not updated recently
      const conversations = await prisma.conversation.findMany({
        where: {
          workspaceId,
          status: { in: ['OPEN', 'PENDING'] },
          updatedAt: { lt: cutoffDate }
        },
        include: { contact: true }
      });

      for (const conversation of conversations) {
        // Skip if already escalated recently to avoid spanning (requires an activity check in production)
        const eventData = {
          conversation,
          contact: conversation.contact,
          contactId: conversation.contactId,
        };
        await executeRule(rule, eventData);
      }
    } catch (error) {
      console.error(`Error executing SLA rule ${rule.id}:`, error);
    }
  }
};

const executeInactivityRule = async (rule) => {
  const { triggerConfig, workspaceId } = rule;
  const days = triggerConfig?.days || 1;
  const excludeResolved = triggerConfig?.excludeResolved !== false;

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
      ...(excludeResolved ? { status: { in: ['OPEN', 'PENDING'] } } : {}),
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
  const evaluation = await evaluateTriggerConditions(rule.workspaceId, triggerConfig, eventData);
  if (!evaluation.passed) {
    return { executed: false, evaluation };
  }

  const contactId = eventData?.contactId || eventData?.contact?.id || null;
  const dealId = eventData?.dealId || eventData?.deal?.id || eventData?.id || null;
  const conversationId = eventData?.conversation?.id || null;

  try {
    // 2. Execute Action
    await executeAction(rule.workspaceId, rule.triggerType, actionType, actionConfig, eventData, rule?.id);

    await createActivity(rule.workspaceId, null, {
      type: 'AUTOMATION_EXECUTED',
      title: `Automation executed: ${rule.name}`,
      content: safeJsonStringify({
        ruleId: rule.id,
        triggerType: rule.triggerType,
        triggerConfig: rule.triggerConfig,
        actionType: rule.actionType,
        actionConfig: rule.actionConfig,
        evaluation,
        event: {
          contactId,
          dealId,
          conversationId,
          stageId: eventData?.stageId || eventData?.deal?.stageId || null,
          message: eventData?.message?.content || null,
        },
      }),
      contactId,
      dealId,
    });

    return { executed: true, evaluation };
  } catch (error) {
    await createActivity(rule.workspaceId, null, {
      type: 'AUTOMATION_FAILED',
      title: `Automation failed: ${rule.name}`,
      content: safeJsonStringify({
        ruleId: rule.id,
        triggerType: rule.triggerType,
        triggerConfig: rule.triggerConfig,
        actionType: rule.actionType,
        actionConfig: rule.actionConfig,
        evaluation,
        error: {
          message: error?.message || 'unknown_error',
        },
        event: {
          contactId,
          dealId,
          conversationId,
          stageId: eventData?.stageId || eventData?.deal?.stageId || null,
          message: eventData?.message?.content || null,
        },
      }),
      contactId,
      dealId,
    });

    throw error;
  }
};

const evaluateTriggerConditions = async (workspaceId, triggerConfig, eventData) => {
  const details = [];
  if (!triggerConfig) {
    return { passed: true, details };
  }

  const operatorRaw = `${triggerConfig?.operator || 'AND'}`.trim().toUpperCase();
  const operator = operatorRaw === 'OR' ? 'OR' : 'AND';

  const stageId = triggerConfig?.stageId || null;
  if (stageId) {
    const eventStageId = eventData?.stageId || eventData?.deal?.stageId || null;
    const passed = Boolean(eventStageId && eventStageId === stageId);
    details.push({
      type: 'stage',
      passed,
      expected: stageId,
      received: eventStageId,
    });
  }

  const keywordsRaw = `${triggerConfig?.keywords || ''}`.trim();
  if (keywordsRaw) {
    const messageContent = `${eventData?.message?.content || ''}`.toLowerCase();
    const keywords = keywordsRaw
      .toLowerCase()
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const passed = keywords.length === 0 ? true : keywords.some((k) => messageContent.includes(k));
    details.push({
      type: 'keywords',
      passed,
      expected: keywords,
      received: messageContent,
    });
  }

  const platform = `${triggerConfig?.platform || ''}`.trim();
  if (platform) {
    const receivedPlatform = `${eventData?.conversation?.platform || eventData?.platform || ''}`.trim();
    const passed = Boolean(receivedPlatform && receivedPlatform === platform);
    details.push({
      type: 'platform',
      passed,
      expected: platform,
      received: receivedPlatform,
    });
  }

  const hours = triggerConfig?.hours || null;
  if (hours && (typeof hours.start === 'number' || typeof hours.end === 'number')) {
    const start = typeof hours.start === 'number' ? hours.start : null;
    const end = typeof hours.end === 'number' ? hours.end : null;
    const hour = (() => {
      const dt = eventData?.occurredAt ? new Date(eventData.occurredAt) : new Date();
      return dt.getHours();
    })();

    const passed = (() => {
      if (start === null || end === null) return true;
      if (start === end) return hour === start;
      if (start < end) return hour >= start && hour <= end;
      return hour >= start || hour <= end;
    })();

    details.push({
      type: 'hours',
      passed,
      expected: { start, end },
      received: hour,
    });
  }

  const tagId = `${triggerConfig?.tagId || ''}`.trim();
  if (tagId) {
    const contactId = eventData?.contactId || eventData?.contact?.id || null;
    if (!contactId) {
      details.push({
        type: 'tag',
        passed: false,
        expected: tagId,
        received: null,
      });
    } else {
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          workspaceId,
        },
        select: {
          id: true,
          tags: {
            select: { id: true },
          },
        },
      });

      const hasTag = Boolean(contact?.tags?.some((t) => t.id === tagId));
      details.push({
        type: 'tag',
        passed: hasTag,
        expected: tagId,
        received: contact?.tags?.map((t) => t.id) || [],
      });
    }
  }

  const passed = details.length === 0
    ? true
    : operator === 'OR'
      ? details.some((d) => d.passed)
      : details.every((d) => d.passed);

  return { passed, operator, details };
};

export const simulateAutomationRule = async (workspaceId, rule, eventData) => {
  const evaluation = await evaluateTriggerConditions(workspaceId, rule?.triggerConfig, eventData);
  const actionType = rule?.actionType;
  const actionConfig = rule?.actionConfig || {};

  const preview = { actionType, actionConfig: { ...actionConfig } };

  if (actionType === 'SEND_WHATSAPP') {
    let messageContent = actionConfig.message || '';
    if (actionConfig.templateId) {
      const template = await prisma.messageTemplate.findFirst({
        where: { id: actionConfig.templateId, workspaceId },
        select: { content: true },
      });
      if (template?.content) messageContent = template.content;
    }
    preview.message = await renderTemplateString(workspaceId, messageContent, { ...eventData });
  }

  if (actionType === 'CREATE_TASK') {
    preview.title = await renderTemplateString(workspaceId, actionConfig?.title || '', { ...eventData });
    preview.content = actionConfig?.content ? await renderTemplateString(workspaceId, actionConfig.content, { ...eventData }) : null;
    preview.dueInDays = Number(actionConfig?.dueInDays || 0);
  }

  if (actionType === 'MOVE_DEAL_STAGE') {
    preview.stageId = actionConfig?.stageId || null;
  }

  if (actionType === 'APPLY_TAG') {
    preview.tagId = actionConfig?.tagId || null;
  }

  if (actionType === 'CALL_WEBHOOK') {
    preview.eventName = actionConfig?.eventName || rule?.triggerType;
  }

  if (actionType === 'MULTI_ACTIONS') {
    const actions = Array.isArray(actionConfig?.actions) ? actionConfig.actions : [];
    preview.actions = await Promise.all(actions.map(async (item) => {
      const type = item?.type || null;
      const config = item?.config || {};
      const delayMinutes = Number(item?.delayMinutes || 0);
      const child = await simulateAutomationRule(workspaceId, { triggerType: rule?.triggerType, actionType: type, actionConfig: config, triggerConfig: rule?.triggerConfig }, eventData);
      return {
        type,
        delayMinutes,
        preview: child?.preview || null,
      };
    }));
  }

  return { evaluation, preview };
};

const executeAction = async (workspaceId, triggerType, actionType, actionConfig, eventData, ruleId = null) => {
  if (actionType === 'MULTI_ACTIONS') {
    const actions = Array.isArray(actionConfig?.actions) ? actionConfig.actions : [];
    for (const action of actions) {
      const type = action?.type;
      const config = action?.config || {};
      const delayMinutes = Number(action?.delayMinutes || 0);

      if (!type) continue;

      if (Number.isFinite(delayMinutes) && delayMinutes > 0) {
        const runAt = new Date(Date.now() + delayMinutes * 60 * 1000);
        await createAutomationJob({
          workspaceId,
          ruleId,
          runAt,
          actionType: type,
          actionConfig: config,
          eventData,
        });
        continue;
      }

      await executeAction(workspaceId, triggerType, type, config, eventData, ruleId);
    }
    return;
  }

  switch (actionType) {
    case 'SEND_WHATSAPP':
      await executeSendWhatsAppAction(workspaceId, actionConfig, eventData);
      break;
    case 'ASSIGN_TO_USER':
      await executeAssignToUserAction(workspaceId, actionConfig, eventData);
      break;
    case 'CREATE_TASK':
      await executeCreateTaskAction(workspaceId, actionConfig, eventData);
      break;
    case 'CALL_WEBHOOK':
      await executeCallWebhookAction(workspaceId, triggerType, actionConfig, eventData);
      break;
    case 'MOVE_DEAL_STAGE':
      await executeMoveDealStageAction(workspaceId, actionConfig, eventData);
      break;
    case 'APPLY_TAG':
      await executeApplyTagAction(workspaceId, actionConfig, eventData);
      break;
    default:
      console.warn(`Unknown action type: ${actionType}`);
  }
};

export const processDueAutomationJobs = async () => {
  const now = new Date();
  const jobs = await findDueAutomationJobs(now, 50);

  for (const job of jobs) {
    try {
      const claimed = await claimAutomationJob(job.id);
      if (!claimed) continue;

      await executeAction(job.workspaceId, 'DELAYED_ACTION', job.actionType, job.actionConfig, job.eventData || {}, job.ruleId || null);

      await completeAutomationJob(job.id);
    } catch (error) {
      await failAutomationJob(job.id, error?.message || 'unknown_error');
    }
  }

  return { processed: jobs.length };
};

const createAutomationJob = async ({ workspaceId, ruleId, runAt, actionType, actionConfig, eventData }) => {
  const hasModel = Boolean(prisma?.automationJob && typeof prisma.automationJob.create === 'function');
  if (hasModel) {
    return await prisma.automationJob.create({
      data: {
        workspaceId,
        ruleId,
        status: 'PENDING',
        runAt,
        actionType,
        actionConfig,
        eventData,
      },
    });
  }

  const id = crypto.randomUUID();
  const actionConfigJson = actionConfig === undefined ? null : safeJsonStringify(actionConfig);
  const eventDataJson = eventData === undefined ? null : safeJsonStringify(eventData);

  await prisma.$executeRaw`
    INSERT INTO "automation_jobs" ("id", "workspaceId", "ruleId", "status", "runAt", "attempts", "lastError", "actionType", "actionConfig", "eventData", "createdAt", "updatedAt")
    VALUES (
      ${id},
      ${workspaceId},
      ${ruleId},
      'PENDING',
      ${runAt},
      0,
      NULL,
      ${actionType},
      CAST(${actionConfigJson} AS jsonb),
      CAST(${eventDataJson} AS jsonb),
      NOW(),
      NOW()
    )
  `;

  return { id };
};

const findDueAutomationJobs = async (now, take = 50) => {
  const hasModel = Boolean(prisma?.automationJob && typeof prisma.automationJob.findMany === 'function');
  if (hasModel) {
    return await prisma.automationJob.findMany({
      where: {
        status: 'PENDING',
        runAt: { lte: now },
      },
      take,
      orderBy: { runAt: 'asc' },
    });
  }

  const rows = await prisma.$queryRaw`
    SELECT "id", "workspaceId", "ruleId", "status", "runAt", "attempts", "lastError", "actionType", "actionConfig", "eventData"
    FROM "automation_jobs"
    WHERE "status" = 'PENDING' AND "runAt" <= ${now}
    ORDER BY "runAt" ASC
    LIMIT ${take}
  `;
  return rows || [];
};

const claimAutomationJob = async (id) => {
  const hasModel = Boolean(prisma?.automationJob && typeof prisma.automationJob.updateMany === 'function');
  if (hasModel) {
    const updated = await prisma.automationJob.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'RUNNING', attempts: { increment: 1 } },
    });
    return updated.count > 0;
  }

  const rows = await prisma.$queryRaw`
    UPDATE "automation_jobs"
    SET "status" = 'RUNNING', "attempts" = "attempts" + 1, "updatedAt" = NOW()
    WHERE "id" = ${id} AND "status" = 'PENDING'
    RETURNING "id"
  `;
  return Array.isArray(rows) && rows.length > 0;
};

const completeAutomationJob = async (id) => {
  const hasModel = Boolean(prisma?.automationJob && typeof prisma.automationJob.update === 'function');
  if (hasModel) {
    await prisma.automationJob.update({
      where: { id },
      data: { status: 'COMPLETED', lastError: null },
    });
    return;
  }

  await prisma.$executeRaw`
    UPDATE "automation_jobs"
    SET "status" = 'COMPLETED', "lastError" = NULL, "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;
};

const failAutomationJob = async (id, lastError) => {
  const hasModel = Boolean(prisma?.automationJob && typeof prisma.automationJob.update === 'function');
  if (hasModel) {
    await prisma.automationJob.update({
      where: { id },
      data: { status: 'FAILED', lastError },
    });
    return;
  }

  await prisma.$executeRaw`
    UPDATE "automation_jobs"
    SET "status" = 'FAILED', "lastError" = ${lastError}, "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;
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
  if (eventData.assignee) {
    result = result.replace(/{{assignee.name}}/g, eventData.assignee.name || '');
  }
  // Add more variables as needed
  return result;
};

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value, (_key, v) => {
      if (typeof v === 'bigint') return v.toString();
      if (v && typeof v === 'object' && v.constructor?.name === 'Decimal' && typeof v.toString === 'function') {
        return v.toString();
      }
      return v;
    });
  } catch (error) {
    return JSON.stringify({ error: 'payload_unserializable' });
  }
};

const executeCreateTaskAction = async (workspaceId, actionConfig, eventData) => {
  const titleTemplate = actionConfig?.title || '';
  const contentTemplate = actionConfig?.content || '';
  const dueInDays = Number(actionConfig?.dueInDays || 0);
  const assigneeId = actionConfig?.assigneeId || null;

  if (!titleTemplate) {
    console.warn('Missing title for CREATE_TASK action');
    return;
  }

  const title = await renderTemplateString(workspaceId, titleTemplate, eventData);
  const content = contentTemplate ? await renderTemplateString(workspaceId, contentTemplate, eventData) : null;

  let dueDate = null;
  if (Number.isFinite(dueInDays) && dueInDays > 0) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);
  }

  const contactId = eventData.contactId || eventData.contact?.id || null;
  const dealId = eventData.dealId || null;

  await prisma.task.create({
    data: {
      workspaceId,
      title,
      content,
      dueDate,
      assigneeId,
      contactId,
      dealId,
    },
  });
};

const executeCallWebhookAction = async (workspaceId, eventType, actionConfig, eventData) => {
  const webhooks = await prisma.webhook.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
  });

  if (webhooks.length === 0) return;

  const payload = {
    event: actionConfig?.eventName || eventType,
    workspaceId,
    data: eventData,
    occurredAt: new Date().toISOString(),
  };

  const rawBody = safeJsonStringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  await Promise.allSettled(webhooks.map(async (webhook) => {
    const events = Array.isArray(webhook.events) ? webhook.events : [webhook.events].filter(Boolean);
    const matches = events.includes('*') || events.includes(eventType) || events.includes(payload.event);
    if (!matches) return;

    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Create the Delivery Log before sending
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: payload.event,
        payload,
        status: 'PENDING',
        attempts: 1,
      }
    });

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-nextacular-event': payload.event,
          'x-nextacular-timestamp': timestamp,
          'x-nextacular-signature': `sha256=${signature}`,
        },
        body: rawBody,
        signal: controller.signal,
      });

      const responseBody = await response.text();
      const isSuccess = response.ok;

      // Update Delivery Log on success or handled error
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          responseCode: response.status,
          responseBody: responseBody.substring(0, 500), // Avoid massive logs
        }
      });
    } catch (error) {
      // Update Delivery Log on network error/timeout
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          responseCode: 0,
          responseBody: error.message || 'Unknown Error',
        }
      });
    } finally {
      clearTimeout(timeout);
    }
  }));
};

const executeMoveDealStageAction = async (workspaceId, actionConfig, eventData) => {
  const stageId = actionConfig?.stageId || null;
  if (!stageId) {
    console.warn('Missing stageId for MOVE_DEAL_STAGE action');
    return;
  }

  const stage = await prisma.stage.findFirst({
    where: {
      id: stageId,
      pipeline: {
        workspaceId,
      },
    },
    select: { id: true },
  });

  if (!stage) {
    console.warn('Stage not found for MOVE_DEAL_STAGE action');
    return;
  }

  const dealId = eventData?.dealId || eventData?.deal?.id || eventData?.id || null;
  if (!dealId) return;

  const currentStageId = eventData?.stageId || eventData?.deal?.stageId || null;
  if (currentStageId && currentStageId === stageId) return;

  await prisma.deal.updateMany({
    where: {
      id: dealId,
      workspaceId,
    },
    data: {
      stageId,
    },
  });
};

const executeApplyTagAction = async (workspaceId, actionConfig, eventData) => {
  const tagId = actionConfig?.tagId || null;
  if (!tagId) {
    console.warn('Missing tagId for APPLY_TAG action');
    return;
  }

  const tag = await prisma.tag.findFirst({
    where: {
      id: tagId,
      workspaceId,
    },
    select: { id: true },
  });

  if (!tag) {
    console.warn('Tag not found for APPLY_TAG action');
    return;
  }

  const contactId = eventData?.contactId || eventData?.contact?.id || null;
  if (!contactId) return;

  await prisma.contact.updateMany({
    where: {
      id: contactId,
      workspaceId,
    },
    data: {
      tags: {
        connect: [{ id: tagId }],
      },
    },
  });
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
    const contact = await prisma.contact.findFirst({ where: { id: contactId, workspaceId } });
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
    const template = await prisma.messageTemplate.findFirst({
      where: { id: actionConfig.templateId, workspaceId },
      select: { content: true },
    });
    if (template) {
      messageContent = template.content;
    }
  }

  // Replace variables
  messageContent = await renderTemplateString(workspaceId, messageContent, eventData);

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
    let integrationId = actionConfig?.integrationId || null;
    if (!integrationId) {
      const defaultIntegration = await prisma.integration.findFirst({
        where: { workspaceId, provider: 'WHATSAPP', enabled: true },
        select: { id: true },
      });
      if (!defaultIntegration?.id) {
        throw new Error('No active WhatsApp integration found');
      }
      integrationId = defaultIntegration.id;
    }

    const wamid = await sendWhatsAppMessage(integrationId, contactPhone, messageContent);

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
