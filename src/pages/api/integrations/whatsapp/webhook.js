import prisma from '@/prisma/index';
import { processAutomation } from '@/prisma/services/automation';
import { log, reportError } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  if (req.method === 'GET') {
    const rl = await rateLimit({ req, limit: 120, windowMs: 60_000 });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'whatsapp_webhook_verify_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    // Webhook Verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const workspaceSlug = req.query['workspace'];

    if (mode && token) {
      if (mode === 'subscribe' && workspaceSlug) {
        // Find the integration for this workspace to check the verify token
        const workspace = await prisma.workspace.findUnique({
          where: { slug: workspaceSlug },
          include: {
            integrations: {
              where: { provider: 'WHATSAPP' },
            },
          },
        });

        const integration = workspace?.integrations[0];

        if (integration && integration.credentials?.verifyToken === token) {
          log({ level: 'info', msg: 'whatsapp_webhook_verified', requestId, workspaceSlug });
          res.status(200).send(challenge);
        } else {
          log({ level: 'warn', msg: 'whatsapp_webhook_verify_failed', requestId, workspaceSlug });
          res.status(403).json({ error: 'Verification failed' });
        }
      } else {
        res.status(403).json({ error: 'Verification failed' });
      }
    } else {
      res.status(400).json({ error: 'Missing parameters' });
    }
  } else if (req.method === 'POST') {
    const rl = await rateLimit({ req, limit: 600, windowMs: 60_000 });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'whatsapp_webhook_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    // Receive Messages
    const body = req.body;
    const workspaceSlug = req.query['workspace'];
    if (!workspaceSlug) {
      return res.status(400).json({ error: 'Missing workspace parameter' });
    }

    log({
      level: 'info',
      msg: 'whatsapp_webhook_received',
      requestId,
      workspaceSlug,
      hasObject: Boolean(body?.object),
      entryCount: Array.isArray(body?.entry) ? body.entry.length : 0,
    });

    if (body.object) {
      if (body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = body.entry[0].changes[0].value.messages[0].from; // sender phone number
        const msg_type = body.entry[0].changes[0].value.messages[0].type;
        let msg_body = '';

        if (msg_type === 'text') {
          msg_body = body.entry[0].changes[0].value.messages[0].text?.body || '';
        } else if (msg_type === 'image') {
          msg_body = body.entry[0].changes[0].value.messages[0].image?.caption || '[Image]';
        } else if (msg_type === 'document') {
          msg_body = body.entry[0].changes[0].value.messages[0].document?.caption || '[Document]';
        } else {
          msg_body = `[${msg_type}]`;
        }

        const wamid = body.entry[0].changes[0].value.messages[0].id;
        const timestamp = body.entry[0].changes[0].value.messages[0].timestamp;
        const name = body.entry[0].changes[0].value.contacts[0]?.profile?.name || from;

        // Process the message
        try {
          await processIncomingMessage(workspaceSlug, from, name, msg_body, msg_type, wamid, timestamp);
        } catch (e) {
          log({ level: 'error', msg: 'whatsapp_message_processing_failed', requestId, workspaceSlug, wamid, error: e });
          reportError(e, { route: '/api/integrations/whatsapp/webhook', requestId, workspaceSlug, wamid });
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function processIncomingMessage(workspaceSlug, from, name, body, type, wamid, timestamp) {
  // 1. Find Workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) throw new Error('Workspace not found');

  // 2. Find or Create Contact
  // We need to normalize phone number if possible, but for now exact match
  let contact = await prisma.contact.findFirst({
    where: {
      workspaceId: workspace.id,
      OR: [
        { phone: from },
        { phone: `+${from}` },
      ]
    }
  });

  if (!contact) {
    // Create new Contact (Lead)
    contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: name || from, // Use phone number as name if name is missing
        phone: from,
      }
    });
  }

  // 3. Find or Create Conversation
  // Look for an open conversation on WHATSAPP platform
  let conversation = await prisma.conversation.findFirst({
    where: {
      workspaceId: workspace.id,
      contactId: contact.id,
      platform: 'WHATSAPP',
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        contactId: contact.id,
        platform: 'WHATSAPP',
      }
    });
  }

  // 4. Create Message
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'INBOUND',
      type: type === 'text' ? 'TEXT' : 'UNKNOWN', // simplify for now
      content: body,
      externalId: wamid,
      status: 'RECEIVED',
    }
  });

  // 5. Update Conversation timestamp
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() }
  });

  // 6. Trigger Automation
  try {
    await processAutomation(workspace.id, 'INCOMING_MESSAGE', {
      contact,
      conversation,
      message
    });
  } catch (err) {
    log({
      level: 'error',
      msg: 'automation_incoming_message_failed',
      requestId: null,
      workspaceId: workspace.id,
      conversationId: conversation.id,
      messageId: message.id,
      error: err,
    });
    reportError(err, { route: 'automation:INCOMING_MESSAGE', workspaceId: workspace.id, conversationId: conversation.id, messageId: message.id });
  }
}
