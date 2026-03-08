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
      const integration = await prisma.integration.findUnique({
        where: {
          workspaceId_provider: {
            workspaceId: workspace.id,
            provider: 'WHATSAPP',
          },
        },
      });

      res.status(200).json({ data: { integration } });
    } catch (error) {
      res.status(500).json({ error: { msg: 'Failed to fetch integration' } });
    }
  } else if (req.method === 'POST') {
    const { enabled, phoneNumberId, accessToken, verifyToken, businessAccountId } = req.body;

    try {
      const integration = await prisma.integration.upsert({
        where: {
          workspaceId_provider: {
            workspaceId: workspace.id,
            provider: 'WHATSAPP',
          },
        },
        update: {
          enabled,
          credentials: {
            phoneNumberId,
            accessToken,
            verifyToken,
            businessAccountId,
          },
        },
        create: {
          workspaceId: workspace.id,
          provider: 'WHATSAPP',
          enabled,
          credentials: {
            phoneNumberId,
            accessToken,
            verifyToken,
            businessAccountId,
          },
        },
      });

      res.status(200).json({ data: { integration } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to update integration' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
