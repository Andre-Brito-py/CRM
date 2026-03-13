import { validateSession } from '@/config/api-validation';
import { deleteWorkspace, getWorkspace, isWorkspaceCreator, isWorkspaceOwner } from '@/prisma/services/workspace';
import { createAuditActivity } from '@/prisma/services/activity';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: { msg: `Method ${req.method} Not Allowed` } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const { workspaceSlug } = req.query;
  const userId = session.user.userId || session.user.id;
  const email = session.user.email;

  const workspace = await getWorkspace(userId, email, workspaceSlug);
  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  const allowed =
    isWorkspaceCreator(userId, workspace.creatorId) ||
    isWorkspaceOwner(email, workspace);

  if (!allowed) {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  try {
    const slug = await deleteWorkspace(userId, email, workspaceSlug);
    await createAuditActivity(
      workspace.id,
      userId,
      { action: 'WORKSPACE_PRIVACY_ERASE', title: 'Workspace data erased', metadata: { slug } },
      req
    );
    return res.status(200).json({ data: { slug } });
  } catch (error) {
    return res.status(500).json({ error: { msg: error.message || 'Failed to erase workspace data' } });
  }
};

export default handler;

