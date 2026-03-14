import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';

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

    // 2. Fetch all relevant data for the workspace
    // Utilizing prisma to aggregate the data safely ensuring we only query within the isolated workspace
    const [
      workspaceInfo,
      pipelines,
      contacts,
      deals,
      customFields,
      webForms,
      tags
    ] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspace.id },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      prisma.pipeline.findMany({
        where: { workspaceId: workspace.id },
        include: { stages: true }
      }),
      prisma.contact.findMany({
        where: { workspaceId: workspace.id },
        include: {
          activities: true,
          tags: true,
        }
      }),
      prisma.deal.findMany({
        where: { workspaceId: workspace.id },
        include: {
          activities: true,
          contact: { select: { id: true, name: true, email: true } },
        }
      }),
      prisma.customField.findMany({
        where: { workspaceId: workspace.id },
      }),
      prisma.webForm.findMany({
        where: { workspaceId: workspace.id },
      }),
      prisma.tag.findMany({
        where: { workspaceId: workspace.id },
      })
    ]);

    // 3. Construct the export payload
    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        requestedBy: session.user.email,
        workspaceId: workspaceInfo.id,
        workspaceName: workspaceInfo.name,
      },
      data: {
        workspace: workspaceInfo,
        pipelines,
        contacts,
        deals,
        customFields,
        webForms,
        tags,
      }
    };

    // 4. Return as JSON attachment
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="export-${workspaceInfo.slug}-${new Date().toISOString().split('T')[0]}.json"`);
    return res.status(200).send(exportData);

  } catch (error) {
    console.error('Data Export Error:', error);
    return res.status(500).json({ error: 'Failed to export workspace data' });
  }
}
