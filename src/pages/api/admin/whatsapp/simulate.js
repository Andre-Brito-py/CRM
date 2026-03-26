import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation/index';
import { processAutomation } from '@/prisma/services/automation';
import { createActivity } from '@/prisma/services/activity';
import { log } from '@/lib/server/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  // Check if user is Admin or Super Admin
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: { msg: 'Permission denied' } });
  }

  const { workspaceSlug, from, name, body } = req.body;

  if (!workspaceSlug || !from || !body) {
    return res.status(400).json({ error: { msg: 'Missing required fields: workspaceSlug, from, body' } });
  }

  try {
    // 1. Find Workspace
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    // 2. Find or Create Contact
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
      contact = await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          name: name || from,
          phone: from,
        }
      });
    }

    // 3. Find or Create Conversation
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
        type: 'TEXT',
        content: body,
        status: 'RECEIVED',
        externalId: `sim_${Date.now()}`,
      }
    });

    // 5. Update Conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });

    // 6. Create Activity
    await createActivity(workspace.id, null, {
      type: 'WHATSAPP_SIMULATED_MESSAGE',
      title: 'Mensagem de WhatsApp simulada',
      content: JSON.stringify({ from, body, conversationId: conversation.id }),
      contactId: contact.id,
    });

    // 7. Trigger Automation (Optional but good for testing)
    try {
      await processAutomation(workspace.id, 'INCOMING_MESSAGE', {
        contact,
        conversation,
        message,
      });
    } catch (err) {
      log({ level: 'error', msg: 'automation_simulation_failed', error: err });
    }

    return res.status(200).json({
      data: {
        success: true,
        messageId: message.id,
        conversationId: conversation.id,
        contactId: contact.id
      }
    });

  } catch (error) {
    log({ level: 'error', msg: 'whatsapp_simulation_failed', error: error.message });
    return res.status(500).json({ error: { msg: 'Internal server error during simulation' } });
  }
}
