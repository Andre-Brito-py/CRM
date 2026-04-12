import prisma from '@/prisma/index';
import { getSession } from 'next-auth/react';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import { deleteApiKey } from '@/prisma/services/api-key';
import { createAuditActivity } from '@/prisma/services/activity';

const handler = async (req, res) => {
  try {
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { workspaceSlug, keyId } = req.query;
    const userId = session.user.userId || session.user.id;
    const isSuperAdmin = session.user.role === 'SUPERADMIN';
    
    let workspace = await getWorkspace(userId, session.user.email, workspaceSlug);

    if (!workspace && isSuperAdmin) {
      workspace = await prisma.workspace.findFirst({
        where: { slug: workspaceSlug, deletedAt: null },
        select: { 
          id: true, 
          name: true, 
          slug: true, 
          members: { select: { email: true, teamRole: true } } 
        }
      });
    }

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const isOwner = isWorkspaceOwner(session.user.email, workspace);
    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'DELETE') {
      const success = await deleteApiKey(workspace.id, keyId);
      if (success) {
        await createAuditActivity(
          workspace.id,
          userId,
          { action: 'API_KEY_DELETE', title: 'API key deleted', target: { apiKeyId: keyId } },
          req
        );
        return res.status(200).json({ message: 'API Key deleted' });
      } else {
        return res.status(404).json({ error: 'API Key not found' });
      }
    }

    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('API Key Delete Handler Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export default handler;
