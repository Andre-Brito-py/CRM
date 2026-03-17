import { validateSession } from '@/config/api-validation';
import { getTemplates, createTemplate } from '@/prisma/services/template';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';

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

  const isOwner = isWorkspaceOwner(session.user.email, workspace);
  if (!isOwner) {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  switch (method) {
    case 'GET':
      try {
        const templates = await getTemplates(workspace.id);
        res.status(200).json({ data: { templates } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to fetch templates' } });
      }
      break;

    case 'POST':
      try {
        const { name, content } = req.body;
        const template = await createTemplate(workspace.id, { name, content });
        res.status(201).json({ data: { template } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to create template' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
