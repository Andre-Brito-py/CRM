import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await validateSession(req, res);

  if (!session) {
    return;
  }

  const { workspaceSlug, provider } = req.query;

  const workspace = await prisma.workspace.findFirst({
    where: { slug: workspaceSlug, deletedAt: null },
    select: { id: true },
  });

  if (!workspace) {
    res.status(404).json({ error: { msg: 'Workspace not found' } });
    return;
  }

  const isMember = await prisma.member.findFirst({
    where: {
      workspaceId: workspace.id,
      email: session.user.email,
      deletedAt: null,
    },
  });

  if (!isMember) {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  if (req.method === 'GET') {
    const integration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
          provider: provider.toUpperCase(),
        },
      },
    });

    res.status(200).json({ data: { enabled: integration?.enabled || false } });
  } else if (req.method === 'POST') {
    const { enabled } = req.body;

    const integration = await prisma.integration.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
          provider: provider.toUpperCase(),
        },
      },
      update: {
        enabled,
      },
      create: {
        workspaceId: workspace.id,
        provider: provider.toUpperCase(),
        enabled,
      },
    });

    res.status(200).json({ data: { integration } });
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
