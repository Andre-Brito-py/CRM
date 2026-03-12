import { validateSession } from '@/config/api-validation';
import { getAutomationRules, createAutomationRule, deleteAutomationRule } from '@/prisma/services/automation';
import { getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  const session = await validateSession(req, res);

  if (!session) return;

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  switch (method) {
    case 'GET':
      try {
        const rules = await getAutomationRules(workspace.id);
        res.status(200).json({ data: { rules } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to fetch automation rules' } });
      }
      break;

    case 'POST':
      try {
        const { name, triggerType, triggerConfig, actionType, actionConfig } = req.body;

        // Basic validation
        if (!name || !triggerType || !actionType) {
          return res.status(400).json({ error: { msg: 'Missing required fields' } });
        }

        const rule = await createAutomationRule(workspace.id, {
          name,
          triggerType,
          triggerConfig,
          actionType,
          actionConfig
        });

        res.status(201).json({ data: { rule } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to create automation rule' } });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.body;
        if (!id) {
          return res.status(400).json({ error: { msg: 'Missing required fields' } });
        }
        const result = await deleteAutomationRule(id, workspace.id);
        return res.status(200).json({ data: { result } });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: { msg: 'Unable to delete automation rule' } });
      }

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
