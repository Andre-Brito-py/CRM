import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const { workspaceSlug } = req.query;
  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

  if (!workspace) {
    res.status(404).json({ error: { msg: 'Workspace not found' } });
    return;
  }

  const isMember = workspace.members.some(
    (member) => member.email === session.user.email
  );

  if (!isMember) {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  if (req.method === 'GET') {
    try {
      const webForms = await prisma.webForm.findMany({
        where: { workspaceId: workspace.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json({ data: { webForms } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Database error' } });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, slug, submitText, successMessage, config, pipelineId, stageId, tagId, isActive } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ error: { msg: 'Name and slug are required' } });
      }

      // Check for slug uniqueness globally or per workspace
      const existing = await prisma.webForm.findUnique({
        where: { slug },
      });

      if (existing) {
        return res.status(400).json({ error: { msg: 'Slug is already in use' } });
      }

      const webForm = await prisma.webForm.create({
        data: {
          workspaceId: workspace.id,
          name,
          slug,
          submitText: submitText || 'Submit',
          successMessage: successMessage || 'Thank you!',
          config: config || [],
          pipelineId: pipelineId || null,
          stageId: stageId || null,
          tagId: tagId || null,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      res.status(201).json({ data: { webForm } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to create WebForm' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
