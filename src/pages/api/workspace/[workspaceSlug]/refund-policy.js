import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'PUT') {
    const session = await validateSession(req, res);
    if (!session) return;

    const { workspaceSlug } = req.query;
    const { refundPolicyTime } = req.body;

    const workspace = await getWorkspace(
      session.user.userId || session.user.id,
      session.user.email,
      workspaceSlug
    );

    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    try {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { refundPolicyTime },
      });
      res.status(200).json({ data: { refundPolicyTime } });
    } catch (error) {
      res.status(500).json({ error: { msg: error.message } });
    }
  } else {
    res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
