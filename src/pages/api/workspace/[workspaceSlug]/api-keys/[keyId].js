import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import { deleteApiKey } from '@/prisma/services/api-key';

const handler = async (req, res) => {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workspaceSlug, keyId } = req.query;
  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  if (req.method === 'DELETE') {
    const success = await deleteApiKey(workspace.id, keyId);
    if (success) {
      return res.status(200).json({ message: 'API Key deleted' });
    } else {
      return res.status(404).json({ error: 'API Key not found' });
    }
  }

  res.setHeader('Allow', ['DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default handler;
