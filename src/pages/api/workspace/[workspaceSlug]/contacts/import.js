import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const { workspaceSlug } = req.query;
  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

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

  if (req.method === 'POST') {
    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      res.status(400).json({ error: { msg: 'No contacts provided' } });
      return;
    }

    // Validate and format contacts
    const validContacts = contacts
      .filter(c => c.name) // Ensure name exists
      .map(c => ({
        workspaceId: workspace.id,
        name: c.name,
        email: c.email || null,
        phone: c.phone || null,
        jobTitle: c.jobTitle || null,
        customFields: c.customFields || {},
      }));

    if (validContacts.length === 0) {
      res.status(400).json({ error: { msg: 'No valid contacts to import' } });
      return;
    }

    try {
      const result = await prisma.contact.createMany({
        data: validContacts,
        skipDuplicates: true, // Optional: skip if unique constraint fails (e.g. email?) 
        // Note: Contact email is NOT unique in schema, so duplicates are allowed by default unless I enforce it.
        // Schema: email String? (no @unique)
      });

      res.status(200).json({ data: { count: result.count } });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ error: { msg: 'Failed to import contacts', debug: error.message } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
