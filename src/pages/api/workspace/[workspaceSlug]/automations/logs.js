import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  const session = await validateSession(req, res);

  if (!session) return;

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);
  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  if (method !== 'GET') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

  try {
    const logs = await prisma.activity.findMany({
      where: {
        workspaceId: workspace.id,
        type: { in: ['AUTOMATION_EXECUTED', 'AUTOMATION_FAILED'] },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true, image: true } },
        contact: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
    });

    return res.status(200).json({ data: { logs } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: { msg: 'Unable to fetch automation logs' } });
  }
};

export default handler;
