import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const { workspaceSlug, contactId } = req.query;
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
    const { type, title, content, date } = req.body;

    if (!title) {
      res.status(400).json({ error: { msg: 'Title is required' } });
      return;
    }

    try {
      const activity = await prisma.activity.create({
        data: {
          workspaceId: workspace.id,
          contactId: contactId,
          userId: session.user.userId,
          type: type || 'NOTE',
          title,
          content,
          date: date ? new Date(date) : new Date(),
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({ data: { activity } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to create activity' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
