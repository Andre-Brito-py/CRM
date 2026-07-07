import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';
import { getWorkspace } from '@/prisma/services/workspace';
import { deleteWebhook, rotateWebhookSecret } from '@/prisma/services/webhook';
import { createAuditActivity } from '@/prisma/services/activity';

const handler = async (req, res) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workspaceSlug, webhookId } = req.query;
  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  if (req.method === 'DELETE') {
    const success = await deleteWebhook(workspace.id, webhookId);
    if (success) {
      await createAuditActivity(
        workspace.id,
        session.user.userId,
        { action: 'WEBHOOK_DELETE', title: 'Webhook deleted', target: { webhookId } },
        req
      );
      return res.status(200).json({ message: 'Webhook deleted' });
    } else {
      return res.status(404).json({ error: 'Webhook not found' });
    }
  }

  if (req.method === 'PATCH') {
    const { action } = req.body || {};

    if (action === 'ROTATE_SECRET') {
      const webhook = await rotateWebhookSecret(workspace.id, webhookId);
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }
      await createAuditActivity(
        workspace.id,
        session.user.userId,
        { action: 'WEBHOOK_ROTATE_SECRET', title: 'Webhook secret rotated', target: { webhookId } },
        req
      );
      return res.status(200).json({ webhook });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  res.setHeader('Allow', ['DELETE', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default handler;
