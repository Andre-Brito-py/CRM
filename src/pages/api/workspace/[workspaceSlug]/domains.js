import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import { getDomainsByWorkspaceId } from '@/prisma/services/domain';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: { msg: 'Unauthorized' } });
    }

    const workspace = await getWorkspace(session.user.userId, session.user.email, req.query.workspaceSlug);
    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    const domains = await getDomainsByWorkspaceId(workspace.id);
    return res.status(200).json({ data: { domains } });
  }

  return res.status(405).json({ error: `${method} method unsupported` });
};

export default handler;
