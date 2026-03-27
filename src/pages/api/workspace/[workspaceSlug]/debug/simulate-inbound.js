import { validateSession } from '@/config/api-validation/index';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { log } from '@/lib/server/logger';

export default async function handler(req, res) {
  const { workspaceSlug } = req.query;
  const { conversationId, content } = req.body;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  const session = await validateSession(req, res);
  if (!session) return;

  const workspace = await getWorkspace(session.user.userId || session.user.id, session.user.email, workspaceSlug);
  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found' } });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.workspaceId !== workspace.id) {
      return res.status(404).json({ error: { msg: 'Conversation not found' } });
    }

    // Insert mock INBOUND message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: content || 'Opa, gostaria de saber mais sobre o produto! Como funciona?',
        direction: 'INBOUND',
        type: 'TEXT',
        status: 'DELIVERED',
        externalId: `simulated-${Date.now()}`,
      },
    });

    // Update conversation last message
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: message.content,
        updatedAt: new Date(),
      },
    });

    // TRIGGER AUTOPILOT
    if (conversation.autopilotEnabled) {
      const { processAutopilotReply } = await import('@/lib/server/autopilot');
      const contact = await prisma.contact.findUnique({
        where: { id: conversation.contactId },
      });
      processAutopilotReply({ workspace, conversation, contact, message }).catch((err) => {
        log({ level: 'error', msg: 'simulated_autopilot_failed', workspaceId: workspace.id, error: err });
      });
    }

    log({ level: 'info', msg: 'simulated_inbound_message', requestId, workspaceId: workspace.id, conversationId: conversation.id, autopilot: conversation.autopilotEnabled });

    res.status(200).json({
      data: {
        message,
        autopilotTriggered: conversation.autopilotEnabled
      }
    });

  } catch (error) {
    log({ level: 'error', msg: 'simulate_inbound_failed', requestId, workspaceId: workspace.id, error });
    res.status(500).json({ error: { msg: 'Simulation failed', details: error.message } });
  }
}
