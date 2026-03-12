import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { simulateAutomationRule } from '@/prisma/services/automation';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  const session = await validateSession(req, res);

  if (!session) return;

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);
  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  if (method !== 'POST') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

  try {
    const { rule, eventData } = req.body || {};
    if (!rule) {
      return res.status(400).json({ error: { msg: 'Missing required fields' } });
    }

    const result = await simulateAutomationRule(workspace.id, rule, eventData || {});
    return res.status(200).json({ data: { result } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: { msg: 'Unable to simulate automation rule' } });
  }
};

export default handler;
