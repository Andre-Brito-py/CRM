import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { getNpsAnalytics } from '@/prisma/services/nps';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;

  if (method !== 'GET') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const workspace = await getWorkspace(
    session.user.userId || session.user.id,
    session.user.email,
    workspaceSlug
  );

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  try {
    const { from, to, surveyId } = req.query;
    const data = await getNpsAnalytics(workspace.id, { from, to, surveyId });
    return res.status(200).json({ data });
  } catch (error) {
    console.error('getNpsAnalytics error:', error);
    return res.status(500).json({ error: { msg: 'Unable to fetch NPS analytics' } });
  }
};

export default handler;

