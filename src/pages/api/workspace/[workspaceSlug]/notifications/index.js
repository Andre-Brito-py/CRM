import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { getNotifications, markAllAsRead } from '@/prisma/services/notification';

export default async function handler(req, res) {
  const session = await validateSession(req, res);

  if (!session) return;

  const { workspaceSlug } = req.query;
  const workspace = await getWorkspace(session.user.userId || session.user.id, session.user.email, workspaceSlug);

  if (!workspace) {
    res.status(403).end();
    return;
  }

  if (req.method === 'GET') {
    const data = await getNotifications(workspace.id, session.user.userId || session.user.id);
    res.status(200).json(data);
  } else if (req.method === 'PUT') {
    await markAllAsRead(workspace.id, session.user.userId || session.user.id);
    res.status(200).json({ status: 'success' });
  } else {
    res.status(405).end();
  }
}
