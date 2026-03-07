import { validateSession } from '@/config/api-validation';
import { createPipeline, getPipelines } from '@/prisma/services/pipeline';
import { getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;

  try {
    const session = await validateSession(req, res);
    if (!session) return;

    const workspace = await getWorkspace(null, session.user.email, workspaceSlug);

    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
    }

    switch (method) {
      case 'GET':
        try {
          let pipelines = await getPipelines(workspace.id);

          // If no pipeline exists, create a default one
          if (pipelines.length === 0) {
            await createPipeline(workspace.id, { name: 'Sales Pipeline' });
            pipelines = await getPipelines(workspace.id);
          }

          // Ensure serialization works (handle Decimals if any issue, though JSON.stringify usually works)
          const safePipelines = JSON.parse(JSON.stringify(pipelines));

          res.status(200).json({ data: { pipelines: safePipelines } });
        } catch (error) {
          console.error('Error fetching pipelines:', error);
          res.status(500).json({ error: { msg: 'Unable to fetch pipelines', debug: error.message } });
        }
        break;

      case 'POST':
        try {
          const { name } = req.body;
          const pipeline = await createPipeline(workspace.id, { name });
          res.status(201).json({ data: { pipeline } });
        } catch (error) {
          console.error('Error creating pipeline:', error);
          res.status(500).json({ error: { msg: 'Unable to create pipeline', debug: error.message } });
        }
        break;

      default:
        res.status(405).json({ error: { msg: `${method} method unsupported` } });
    }
  } catch (error) {
    console.error('Unhandled API Error:', error);
    // Ensure we return JSON even for unhandled errors
    res.status(500).json({ error: { msg: 'Internal Server Error', debug: error.message } });
  }
};

export default handler;
