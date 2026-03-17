import { getSession } from 'next-auth/react';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
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

  const isOwner = isWorkspaceOwner(session.user.email, workspace);
  if (!isOwner) {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  if (req.method === 'PUT') {
    const { customFieldDefinitions } = req.body;

    // Validate customFieldDefinitions
    if (!Array.isArray(customFieldDefinitions)) {
      res.status(400).json({ error: { msg: 'Invalid format' } });
      return;
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspace.id },
      data: { customFieldDefinitions },
    });

    res.status(200).json({ data: { workspace: updatedWorkspace } });
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
