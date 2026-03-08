import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import { getApiKeys, createApiKey } from '@/prisma/services/api-key';

const handler = async (req, res) => {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workspaceSlug } = req.query;
  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  if (req.method === 'GET') {
    const apiKeys = await getApiKeys(workspace.id);
    return res.status(200).json({ apiKeys });
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const apiKey = await createApiKey(workspace.id, name);
    return res.status(201).json({ apiKey });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default handler;
