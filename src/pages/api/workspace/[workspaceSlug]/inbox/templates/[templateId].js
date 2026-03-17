import { getSession } from 'next-auth/react';
import { deleteTemplate, updateTemplate } from '@/prisma/services/template';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, templateId } = req.query;
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const workspace = await getWorkspace(
    session.user.userId || session.user.id,
    session.user.email,
    workspaceSlug
  );

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found' } });
  }

  const isOwner = isWorkspaceOwner(session.user.email, workspace);
  if (!isOwner) {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  switch (method) {
    case 'DELETE':
      try {
        await deleteTemplate(templateId, workspace.id);
        res.status(200).json({ data: { msg: 'Template deleted' } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to delete template' } });
      }
      break;

    case 'PUT':
      try {
        const { name, content } = req.body;
        await updateTemplate(templateId, workspace.id, { name, content });
        res.status(200).json({ data: { msg: 'Template updated' } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to update template' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
