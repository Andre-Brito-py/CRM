import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, webhookId } = req.query;
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

  if (method === 'GET') {
    try {
      // First, verify the webhook belongs to the workspace
      const webhook = await prisma.webhook.findFirst({
        where: { id: webhookId, workspaceId: workspace.id }
      });

      if (!webhook) {
        return res.status(404).json({ error: { msg: 'Webhook not found' } });
      }

      const deliveries = await prisma.webhookDelivery.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to recent 50 for performance
      });

      res.status(200).json({ data: { deliveries } });
    } catch (error) {
      res.status(500).json({ error: { msg: 'Unable to fetch webhook deliveries' } });
    }
  } else {
    res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
