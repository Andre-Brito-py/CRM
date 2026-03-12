import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { createNpsSurvey } from '@/prisma/services/nps';

const handler = async (req, res) => {
  const { method } = req;

  if (method !== 'POST') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const { workspaceSlug } = req.query;
  const body = req.body || {};
  const effectiveWorkspaceSlug = workspaceSlug || body.workspaceSlug || null;

  if (!effectiveWorkspaceSlug) {
    return res.status(400).json({ error: { msg: 'workspaceSlug is required' } });
  }

  const workspace = await getWorkspace(
    session.user.userId || session.user.id,
    session.user.email,
    effectiveWorkspaceSlug
  );

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  try {
    const { name, trigger_type } = body;
    if (!name) {
      return res.status(400).json({ error: { msg: 'name is required' } });
    }

    const triggerType = `${trigger_type || 'manual'}`.trim();
    if (!['manual', 'deal_closed', 'scheduled'].includes(triggerType)) {
      return res.status(400).json({ error: { msg: 'Invalid trigger_type' } });
    }

    const survey = await createNpsSurvey(workspace.id, { name, triggerType });
    return res.status(201).json({ data: { survey } });
  } catch (error) {
    console.error('api/nps/surveys error:', error);
    return res.status(500).json({ error: { msg: 'Unable to create survey' } });
  }
};

export default handler;

