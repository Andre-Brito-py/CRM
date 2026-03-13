import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import { getNotifications, markAllAsRead } from '@/prisma/services/notification';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).end();
    return;
  }

  const { workspaceSlug } = req.query;
  const workspace = await getWorkspace(session.user.id, workspaceSlug);

  if (!workspace) {
    res.status(403).end();
    return;
  }

  if (req.method === 'GET') {
    const data = await getNotifications(workspace.id, session.user.id);
    res.status(200).json(data);
  } else if (req.method === 'PUT') {
    await markAllAsRead(workspace.id, session.user.id);
    res.status(200).json({ status: 'success' });
  } else {
    res.status(405).end();
  }
}
