import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const { workspaceSlug, id } = req.query;
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

  const webForm = await prisma.webForm.findFirst({
    where: { id, workspaceId: workspace.id, deletedAt: null },
  });

  if (!webForm) {
    res.status(404).json({ error: { msg: 'WebForm not found' } });
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ data: { webForm } });
  } else if (req.method === 'PUT') {
    try {
      const { name, slug, submitText, successMessage, config, pipelineId, stageId, tagId, isActive } = req.body;

      if (slug && slug !== webForm.slug) {
        const existing = await prisma.webForm.findUnique({
          where: { slug },
        });
        if (existing) {
          return res.status(400).json({ error: { msg: 'Slug is already in use' } });
        }
      }

      const updatedForm = await prisma.webForm.update({
        where: { id },
        data: {
          name: name !== undefined ? name : webForm.name,
          slug: slug !== undefined ? slug : webForm.slug,
          submitText: submitText !== undefined ? submitText : webForm.submitText,
          successMessage: successMessage !== undefined ? successMessage : webForm.successMessage,
          config: config !== undefined ? config : webForm.config,
          pipelineId: pipelineId !== undefined ? pipelineId : webForm.pipelineId,
          stageId: stageId !== undefined ? stageId : webForm.stageId,
          tagId: tagId !== undefined ? tagId : webForm.tagId,
          isActive: isActive !== undefined ? isActive : webForm.isActive,
        },
      });

      res.status(200).json({ data: { webForm: updatedForm } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to update WebForm' } });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.webForm.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      res.status(200).json({ data: { success: true } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to delete WebForm' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
