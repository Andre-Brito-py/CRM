import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { createNpsSurvey, listNpsSurveys } from '@/prisma/services/nps';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;

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

  if (method === 'GET') {
    try {
      const surveys = await listNpsSurveys(workspace.id);
      return res.status(200).json({ data: { surveys } });
    } catch (error) {
      console.error('listNpsSurveys error:', error);
      return res.status(500).json({ error: { msg: 'Unable to fetch surveys' } });
    }
  }

  if (method === 'POST') {
    try {
      const { name, trigger_type } = req.body || {};

      if (!name) {
        return res.status(400).json({ error: { msg: 'Name is required' } });
      }

      const triggerType = `${trigger_type || 'manual'}`.trim();
      if (!['manual', 'deal_closed', 'scheduled'].includes(triggerType)) {
        return res.status(400).json({ error: { msg: 'Invalid trigger_type' } });
      }

      const survey = await createNpsSurvey(workspace.id, {
        name,
        triggerType,
      });

      return res.status(201).json({ data: { survey } });
    } catch (error) {
      console.error('createNpsSurvey error:', error);
      return res.status(500).json({ error: { msg: 'Unable to create survey' } });
    }
  }

  return res.status(405).json({ error: { msg: `${method} method unsupported` } });
};

export default handler;

