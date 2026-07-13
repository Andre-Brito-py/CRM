import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { verifyDomainDns } from '@/lib/server/dns-checker';

export default async function handler(req, res) {
  const session = await validateSession(req, res);

  if (!session) {
    return;
  }

  const { workspaceSlug } = req.query;

  const workspace = await prisma.workspace.findFirst({
    where: { slug: workspaceSlug, deletedAt: null },
    select: { id: true },
  });

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found' } });
  }

  const isMember = await prisma.member.findFirst({
    where: {
      workspaceId: workspace.id,
      email: session.user.email,
      deletedAt: null,
    },
  });

  if (!isMember) {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  if (req.method === 'GET') {
    try {
      const inboxes = await prisma.emailInbox.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json({ data: inboxes });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Failed to fetch inboxes' } });
    }
  }

  if (req.method === 'POST') {
    const { email, provider, credentials, dailyLimit } = req.body;

    if (!email || !provider || !credentials) {
      return res.status(400).json({ error: { msg: 'Missing required parameters' } });
    }

    try {
      const inbox = await prisma.emailInbox.create({
        data: {
          workspaceId: workspace.id,
          email: String(email).trim().toLowerCase(),
          provider: String(provider).toUpperCase(),
          credentials: typeof credentials === 'string' ? JSON.parse(credentials) : credentials,
          dailyLimit: dailyLimit ? Number(dailyLimit) : 50,
          sentToday: 0,
          isActive: true
        }
      });
      return res.status(201).json({ data: inbox });
    } catch (error) {
      console.error(error);
      if (error.code === 'P2002') {
        return res.status(400).json({ error: { msg: 'This email is already registered.' } });
      }
      return res.status(500).json({ error: { msg: 'Failed to create inbox.' } });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: { msg: 'Missing inbox ID' } });
    }

    try {
      await prisma.emailInbox.deleteMany({
        where: { id, workspaceId: workspace.id }
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Failed to delete inbox.' } });
    }
  }

  if (req.method === 'PATCH') {
    const { id, isActive } = req.body;

    if (!id) {
      return res.status(400).json({ error: { msg: 'Missing inbox ID' } });
    }

    try {
      const inbox = await prisma.emailInbox.update({
        where: { id },
        data: {
          isActive: isActive === true
        }
      });
      return res.status(200).json({ data: inbox });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Failed to update inbox.' } });
    }
  }

  return res.status(405).json({ error: { msg: 'Method not supported' } });
}
