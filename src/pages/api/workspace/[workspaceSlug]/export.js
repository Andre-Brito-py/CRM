import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';

// Helper: run a Prisma query and return fallback on failure (graceful degradation)
const safeQuery = async (fn, fallback = []) => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workspaceSlug } = req.query;

  try {
    // 1. Validate permissions
    const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);
    if (!workspace) {
      return res.status(403).json({ error: 'Forbidden or Workspace not found' });
    }

    // 2. Fetch workspace data — each query is individually guarded to avoid total failure
    const [workspaceInfo, pipelines, contacts, deals, customFields, webForms, tags] =
      await Promise.all([
        safeQuery(
          () =>
            prisma.workspace.findUnique({
              where: { id: workspace.id },
              select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
            }),
          null
        ),
        safeQuery(() =>
          prisma.pipeline.findMany({
            where: { workspaceId: workspace.id },
            include: { stages: true },
          })
        ),
        safeQuery(() =>
          prisma.contact.findMany({
            where: { workspaceId: workspace.id },
            include: { activities: true },
          })
        ),
        safeQuery(() =>
          prisma.deal.findMany({
            where: { workspaceId: workspace.id },
            include: {
              activities: true,
              contact: { select: { id: true, name: true, email: true } },
            },
          })
        ),
        safeQuery(() =>
          prisma.customField.findMany({ where: { workspaceId: workspace.id } })
        ),
        // WebForm & Tag: gracefully skip if not in this schema version
        safeQuery(async () => {
          if (!prisma.webForm) return [];
          return prisma.webForm.findMany({ where: { workspaceId: workspace.id } });
        }),
        safeQuery(async () => {
          if (!prisma.tag) return [];
          return prisma.tag.findMany({ where: { workspaceId: workspace.id } });
        }),
      ]);

    // 3. Build export payload
    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        requestedBy: session.user.email,
        workspaceId: workspaceInfo?.id ?? workspace.id,
        workspaceName: workspaceInfo?.name ?? workspaceSlug,
      },
      data: {
        workspace: workspaceInfo,
        pipelines,
        contacts,
        deals,
        customFields,
        webForms,
        tags,
      },
    };

    // 4. Send as downloadable JSON attachment
    const filename = `export-${workspaceInfo?.slug ?? workspaceSlug}-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(exportData);
  } catch (error) {
    console.error('Data Export Error:', error);
    return res.status(500).json({ error: 'Failed to export workspace data' });
  }
}
