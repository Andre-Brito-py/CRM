import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const { workspaceSlug } = req.query;

  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: { some: { email: session.user.email, deletedAt: null } },
      },
      select: { id: true },
    });

    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    // Exclui a integração do banco de dados
    await prisma.integration.deleteMany({
      where: {
        workspaceId: workspace.id,
        provider: 'META_ADS',
      },
    });

    return res.status(200).json({ data: { success: true } });
  } catch (error) {
    console.error('Error disconnecting Meta Ads:', error);
    return res.status(500).json({ error: { msg: 'Internal server error' } });
  }
}
