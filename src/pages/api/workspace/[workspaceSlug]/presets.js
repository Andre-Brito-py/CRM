import { validateSession } from '@/config/api-validation';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
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

  const isOwner = isWorkspaceOwner(session.user.email, workspace);
  if (!isOwner) {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  if (method === 'POST') {
    try {
      const { presetId } = req.body;
      const preset = INDUSTRY_PRESETS.find(p => p.id === presetId);

      if (!preset) {
        return res.status(400).json({ error: { msg: 'Invalid preset ID' } });
      }

      // 0. Update AI Context if empty
      if (preset.aiContext && !workspace.aiContext) {
        await prisma.workspace.update({
          where: { id: workspace.id },
          data: { aiContext: preset.aiContext }
        });
      }

      // 0.5. Inject Message Templates
      if (preset.messageTemplates && preset.messageTemplates.length > 0) {
        const existingTpls = await prisma.messageTemplate.findMany({
          where: { workspaceId: workspace.id }
        });
        const existingNames = existingTpls.map(t => t.name.toLowerCase());
        
        const newTpls = preset.messageTemplates.filter(
          t => !existingNames.includes(t.name.toLowerCase())
        );

        if (newTpls.length > 0) {
          await prisma.messageTemplate.createMany({
            data: newTpls.map(t => ({
              name: t.name,
              content: t.content,
              workspaceId: workspace.id,
            }))
          });
        }
      }

      // 1. Create Pipelines, Stages and Inject Demo Data
      if (preset.pipelines && preset.pipelines.length > 0) {
        for (const pipe of preset.pipelines) {
          const newPipeline = await prisma.pipeline.create({
            data: {
              name: pipe.name,
              workspaceId: workspace.id,
            }
          });

          // Create stages for this pipeline mapping Stage Index to Id
          if (pipe.stages && pipe.stages.length > 0) {
            const createdStages = [];
            for (let index = 0; index < pipe.stages.length; index++) {
              const stage = pipe.stages[index];
              const newStage = await prisma.stage.create({
                data: {
                  name: stage.name,
                  color: stage.color,
                  order: index,
                  pipelineId: newPipeline.id,
                }
              });
              createdStages.push(newStage);
            }

            // INJECT DEMO DATA
            if (preset.demoData && preset.demoData.length > 0) {
              for (const demo of preset.demoData) {
                // Determine stage by index, default to first stage if out of bounds
                const targetStage = createdStages[demo.stageIndex] || createdStages[0];
                
                // Create Mock Contact
                const contact = await prisma.contact.create({
                  data: {
                    workspaceId: workspace.id,
                    name: demo.contactName,
                  }
                });

                // Create Mock Deal
                await prisma.deal.create({
                  data: {
                    workspaceId: workspace.id,
                    contactId: contact.id,
                    stageId: targetStage.id,
                    name: demo.dealTitle,
                    amount: demo.amount,
                  }
                });
              }
            }
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

      // Apply the example tag to old demo contacts if needed
      // Find the 'exemplo' tag
      const demoTag = await prisma.tag.findFirst({
        where: { workspaceId: workspace.id, name: { contains: 'Exemplo' } }
      });
      if (demoTag) {
        // Link all recently created demo contacts to this tag
        if (preset.demoData && preset.demoData.length > 0) {
          const demoContactNames = preset.demoData.map(d => d.contactName);
          const demoContacts = await prisma.contact.findMany({
            where: { workspaceId: workspace.id, name: { in: demoContactNames } }
          });
          for (const c of demoContacts) {
            // Check if tag is already connected
            // We use raw relation table for _ContactToTag conceptually, but since prisma tag schema uses implicit m:n, we do an update
            await prisma.contact.update({
              where: { id: c.id },
              data: {
                tags: { connect: { id: demoTag.id } }
              }
            });
          }
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
