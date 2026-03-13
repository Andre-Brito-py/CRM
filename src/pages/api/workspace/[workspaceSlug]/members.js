import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import { getMembersByWorkspaceId } from '@/prisma/services/membership';

const handler = async (req, res) => {
  const { method } = req;
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: { msg: 'Unauthorized' } });
  }

  if (method === 'GET') {
    const workspace = await getWorkspace(session.user.userId, session.user.email, req.query.workspaceSlug);
    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    const members = await getMembersByWorkspaceId(workspace.id);
    return res.status(200).json({ data: { members } });
  }

  return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
};

export default handler;
