import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';
import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { createContact, updateContact } from '@/prisma/services/contact';
import { createAuditActivity } from '@/prisma/services/activity';
import { log, reportError } from '@/lib/server/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: 'Method not supported' } });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: { msg: 'Unauthorized' } });
  }

  const { workspaceSlug, conversationId } = req.query;
  const { name, email, phone: reqPhone } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: { msg: 'Name is required' } });
  }

  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);
  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found' } });
  }

  try {
    // 1. Get the conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, externalId: true, contactId: true, platform: true }
    });

    if (!conversation) {
      return res.status(404).json({ error: { msg: 'Conversation not found' } });
    }

    // 2. Prepare phone number (externalId often holds the phone in WhatsApp)
    const phone = reqPhone ? reqPhone.trim() : (conversation.platform === 'WHATSAPP' ? conversation.externalId : null);

    // 3. Create or Update the contact
    let contact;
    if (conversation.contactId) {
      contact = await updateContact(conversation.contactId, workspace.id, {
        name: name.trim(),
        email: email ? email.trim() : null,
        phone: phone,
      });

      await createAuditActivity(
        workspace.id,
        session.user.userId || session.user.id,
        {
          action: 'CONTACT_UPDATE_FROM_INBOX',
          title: `Contact updated from inbox: ${contact.name}`,
          target: { contactId: contact.id, conversationId },
          metadata: { name: contact.name, email: contact.email, phone: contact.phone },
        },
        req
      );
    } else {
      contact = await createContact(workspace.id, {
        name: name.trim(),
        email: email ? email.trim() : null,
        phone: phone,
      });

      // 4. Link the conversation to this contact
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { contactId: contact.id }
      });

      // 5. Create Audit Activity
      await createAuditActivity(
        workspace.id,
        session.user.userId || session.user.id,
        {
          action: 'CONTACT_CREATE_FROM_INBOX',
          title: `Contact created from inbox: ${contact.name}`,
          target: { contactId: contact.id, conversationId },
          metadata: { name: contact.name, email: contact.email, phone: contact.phone },
        },
        req
      );
    }

    res.status(200).json({ data: { contact } });
  } catch (error) {
    log({ level: 'error', msg: 'save_contact_from_inbox_failed', workspaceId: workspace.id, conversationId, error });
    reportError(error, { route: 'api/workspace/[workspaceSlug]/inbox/[conversationId]/save-contact' });
    res.status(500).json({ error: { msg: 'Failed to save contact' } });
  }
}
