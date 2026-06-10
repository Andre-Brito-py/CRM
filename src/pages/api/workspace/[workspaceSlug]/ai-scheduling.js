import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;

  try {
    const session = await validateSession(req, res);
    if (!session) return;

    if (method === 'PUT') {
      const { aiSchedulingEnabled } = req.body;
      const workspace = await getWorkspace(
        session.user.userId || session.user.id,
        session.user.email,
        workspaceSlug
      );

      if (!workspace) {
        return res.status(404).json({ error: { msg: 'Workspace not found' } });
      }

      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { aiSchedulingEnabled: Boolean(aiSchedulingEnabled) },
      });

      return res.status(200).json({ data: { aiSchedulingEnabled: Boolean(aiSchedulingEnabled) } });
    } else {
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
    }
  } catch (error) {
    res.status(500).json({ error: { msg: error.message } });
  }
};

export default handler;
