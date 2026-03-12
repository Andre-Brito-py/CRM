import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import { getWebhooks, createWebhook } from '@/prisma/services/webhook';

const normalizeEvents = (value) => {
  if (Array.isArray(value)) {
    const events = value.map((e) => `${e}`.trim()).filter(Boolean);
    return events.length > 0 ? events : ['*'];
  }
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return ['*'];
    const events = raw.split(',').map((e) => e.trim()).filter(Boolean);
    return events.length > 0 ? events : ['*'];
  }
  return ['*'];
};

const handler = async (req, res) => {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workspaceSlug } = req.query;
  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  if (req.method === 'GET') {
    const webhooks = await getWebhooks(workspace.id);
    return res.status(200).json({ webhooks });
  }

  if (req.method === 'POST') {
    const { url, events } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const webhook = await createWebhook(workspace.id, url, normalizeEvents(events));
    return res.status(201).json({ webhook });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default handler;
