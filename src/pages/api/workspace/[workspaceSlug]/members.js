import { validateSession } from '@/config/api-validation';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import { getMembersByWorkspaceId } from '@/prisma/services/membership';

const handler = async (req, res) => {
  const { method } = req;
  const session = await validateSession(req, res);

  if (!session) return;

  if (method === 'GET') {
    const workspace = await getWorkspace(session.user.userId || session.user.id, session.user.email, req.query.workspaceSlug);
    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    const isOwner = isWorkspaceOwner(session.user.email, workspace);
    if (!isOwner) {
      return res.status(403).json({ error: { msg: 'Forbidden' } });
    }

    const members = await getMembersByWorkspaceId(workspace.id);
    return res.status(200).json({ data: { members } });
  }

  return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
};

export default handler;
