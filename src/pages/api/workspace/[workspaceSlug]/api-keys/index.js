import { getSession } from 'next-auth/react';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import { getApiKeys, createApiKey } from '@/prisma/services/api-key';
import { createAuditActivity } from '@/prisma/services/activity';

const handler = async (req, res) => {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workspaceSlug } = req.query;
  const userId = session.user.userId || session.user.id;
  const workspace = await getWorkspace(userId, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  const isOwner = isWorkspaceOwner(session.user.email, workspace);
  const isSuperAdmin = session.user.role === 'SUPERADMIN';
  
  if (!isOwner && !isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
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
    await createAuditActivity(
      workspace.id,
      userId,
      {
        action: 'API_KEY_CREATE',
        title: 'API key created',
        target: { apiKeyId: apiKey?.id || null },
        metadata: { name: apiKey?.name || name },
      },
      req
    );
    return res.status(201).json({ apiKey });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default handler;
