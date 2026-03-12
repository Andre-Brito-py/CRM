import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { INDUSTRY_PRESETS } from '@/lib/server/presets';

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

  if (method === 'POST') {
    try {
      const { presetId } = req.body;
      const preset = INDUSTRY_PRESETS.find(p => p.id === presetId);

      if (!preset) {
        return res.status(400).json({ error: { msg: 'Invalid preset ID' } });
      }

      // 1. Create Pipelines and Stages
      if (preset.pipelines && preset.pipelines.length > 0) {
        for (const pipe of preset.pipelines) {
          const newPipeline = await prisma.pipeline.create({
            data: {
              name: pipe.name,
              workspaceId: workspace.id,
            }
          });

          // Create stages for this pipeline
          if (pipe.stages && pipe.stages.length > 0) {
            await prisma.stage.createMany({
              data: pipe.stages.map((stage, index) => ({
                name: stage.name,
                color: stage.color,
                order: index,
                pipelineId: newPipeline.id,
              }))
            });
          }
        }
      }

      // 2. Append Custom Fields to Workspace
      if (preset.customFields && preset.customFields.length > 0) {
        let existingFields = Array.isArray(workspace.customFieldDefinitions) 
          ? workspace.customFieldDefinitions 
          : [];

        // Check for duplicates before adding
        const newFields = preset.customFields.filter(
          pf => !existingFields.some(ef => ef.key === pf.key)
        );

        if (newFields.length > 0) {
          const updatedFields = [...existingFields, ...newFields];
          await prisma.workspace.update({
            where: { id: workspace.id },
            data: { customFieldDefinitions: updatedFields }
          });
        }
      }

      // 3. Create Tags
      if (preset.tags && preset.tags.length > 0) {
        // Find existing tags to avoid exact duplicates
        const existingTags = await prisma.tag.findMany({
          where: { workspaceId: workspace.id }
        });
        const existingTagNames = existingTags.map(t => t.name.toLowerCase());

        const newTags = preset.tags.filter(
          t => !existingTagNames.includes(t.name.toLowerCase())
        );

        if (newTags.length > 0) {
          await prisma.tag.createMany({
            data: newTags.map(t => ({
              name: t.name,
              color: t.color || '#3b82f6',
              workspaceId: workspace.id,
            }))
          });
        }
      }

      res.status(200).json({ data: { msg: 'Preset applied successfully' } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Unable to apply preset' } });
    }
  } else if (method === 'GET') {
    // Return available presets for the frontend to display
    res.status(200).json({ data: { presets: INDUSTRY_PRESETS } });
  } else {
    res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
