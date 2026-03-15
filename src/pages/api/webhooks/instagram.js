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
      log({ level: 'warn', msg: 'instagram_webhook_verify_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    // Webhook Verification (Meta standard)
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const workspaceSlug = req.query['workspace'];

    if (mode && token) {
      if (mode === 'subscribe' && workspaceSlug) {
        const workspace = await prisma.workspace.findUnique({
          where: { slug: workspaceSlug },
          include: {
            integrations: {
              where: { provider: 'INSTAGRAM' },
            },
          },
        });

        const integration = workspace?.integrations[0];

        if (integration && integration.credentials?.verifyToken === token) {
          log({ level: 'info', msg: 'instagram_webhook_verified', requestId, workspaceSlug });
          return res.status(200).send(challenge);
        } else {
          log({ level: 'warn', msg: 'instagram_webhook_verify_failed', requestId, workspaceSlug });
          return res.status(403).json({ error: 'Verification failed' });
        }
      }
    }
    return res.status(400).json({ error: 'Missing parameters or invalid mode' });

  } else if (req.method === 'POST') {
    const rl = await rateLimit({ req, limit: 1000, windowMs: 60_000 });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'instagram_webhook_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    const body = req.body;
    const workspaceSlug = req.query['workspace'];

    if (!workspaceSlug) {
      return res.status(400).json({ error: 'Missing workspace parameter' });
    }

    if (body.object === 'instagram') {
      try {
        for (const entry of body.entry) {
          if (entry.messaging) {
            for (const messagingItem of entry.messaging) {
              if (messagingItem.message && !messagingItem.message.is_echo) {
                const senderId = messagingItem.sender.id;
                const messageText = messagingItem.message.text || '';
                const mid = messagingItem.message.mid;
                const timestamp = messagingItem.timestamp;

                await processIncomingInstagramMessage(workspaceSlug, senderId, messageText, mid, timestamp);
              }
            }
          }
        }
        return res.status(200).send('EVENT_RECEIVED');
      } catch (e) {
        log({ level: 'error', msg: 'instagram_message_processing_failed', requestId, workspaceSlug, error: e });
        reportError(e, { route: '/api/webhooks/instagram', requestId, workspaceSlug });
        return res.status(500).json({ error: 'Internal error' });
      }
    }
    return res.status(404).send('NOT_SUPPORTED');
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function processIncomingInstagramMessage(workspaceSlug, senderId, body, mid, timestamp) {
  // 1. Find Workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) throw new Error('Workspace not found');

  // 2. Find or Create Contact
  let contact = await prisma.contact.findFirst({
    where: {
      workspaceId: workspace.id,
      OR: [
        { externalId: senderId }, // Assuming we store IG ID here or custom field
        { customFields: { path: ['instagramId'], equals: senderId } }
      ]
    }
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: `Instagram User ${senderId.substring(0, 6)}`,
        customFields: { instagramId: senderId }
      }
    });
  }

  // 3. Find or Create Conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      workspaceId: workspace.id,
      contactId: contact.id,
      platform: 'INSTAGRAM',
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        contactId: contact.id,
        platform: 'INSTAGRAM',
        externalId: senderId
      }
    });
  }

  // 4. Create Message
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: body,
      externalId: mid,
      status: 'RECEIVED',
    }
  });

  // 5. Update Conversation timestamp
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() }
  });

  // 6. Trigger Automation (if any)
  try {
    await processAutomation(workspace.id, 'INCOMING_MESSAGE', {
      contact,
      conversation,
      message
    });
  } catch (err) {
    // log error but don't fail the whole process
    console.error('Automation error:', err);
  }
}
