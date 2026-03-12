import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';

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

  if (method !== 'GET') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

  try {
    const { from, to, classification, surveyId, take } = req.query;
    const where = {
      workspaceId: workspace.id,
      ...(surveyId ? { surveyId: `${surveyId}` } : {}),
      ...(classification ? { classification: `${classification}` } : {}),
      ...(from || to
        ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
        : {}),
    };

    const limit = Math.min(Math.max(parseInt(take || '100', 10), 1), 500);

    const responses = await prisma.npsResponse.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        score: true,
        feedbackText: true,
        classification: true,
        createdAt: true,
        contact: { select: { id: true, name: true, email: true, phone: true } },
        survey: { select: { id: true, name: true } },
      },
    });

    return res.status(200).json({ data: { responses } });
  } catch (error) {
    console.error('listNpsResponses error:', error);
    return res.status(500).json({ error: { msg: 'Unable to fetch responses' } });
  }
};

export default handler;

