import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, stageId } = req.query;

  if (method !== 'GET') {
    return res.status(405).json({ error: { msg: 'Method not supported' } });
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
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(100, parseInt(req.query.pageSize) || 50);
    const skip = (page - 1) * pageSize;

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where: { stageId, workspaceId: workspace.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: skip,
        include: {
          company: true,
          contact: true,
        },
      }),
      prisma.deal.count({
        where: { stageId, workspaceId: workspace.id, deletedAt: null },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    res.status(200).json({
      data: {
        deals,
        meta: {
          page,
          pageSize,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching stage deals:', error);
    res.status(500).json({ error: { msg: 'Unable to fetch stage deals' } });
  }
};

export default handler;
