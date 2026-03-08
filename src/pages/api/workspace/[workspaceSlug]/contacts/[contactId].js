import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import { getContact, updateContact, deleteContact } from '@/prisma/services/contact';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const { workspaceSlug, contactId } = req.query;
  const workspace = await getWorkspace(
    session.user.userId,
    session.user.email,
    workspaceSlug
  );

  if (!workspace) {
    res.status(404).json({ error: { msg: 'Workspace not found' } });
    return;
  }

  const isMember = workspace.members.some(
    (member) => member.email === session.user.email
  );

  if (!isMember) {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  switch (req.method) {
    case 'GET': {
      const contact = await getContact(contactId);
      if (!contact || contact.workspaceId !== workspace.id) {
        res.status(404).json({ error: { msg: 'Contact not found' } });
        return;
      }
      res.status(200).json({ data: { contact } });
      break;
    }
    case 'PUT': {
      const { tags, ...data } = req.body;

      const contact = await updateContact(contactId, {
        ...data,
        ...(tags ? { tags } : {}),
      });
      res.status(200).json({ data: { contact } });
      break;
    }
    case 'DELETE': {
      await deleteContact(contactId);
      res.status(200).json({ data: { msg: 'Contact deleted' } });
      break;
    }
    default:
      res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
