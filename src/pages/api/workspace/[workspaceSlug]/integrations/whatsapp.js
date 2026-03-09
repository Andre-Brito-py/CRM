import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { canAddWhatsAppIntegration } from '@/lib/server/subscription';

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
      const integrations = await prisma.integration.findMany({
        where: {
          workspaceId: workspace.id,
          provider: 'WHATSAPP',
        },
      });

      res.status(200).json({ data: { integrations } });
    } catch (error) {
      res.status(500).json({ error: { msg: 'Failed to fetch integrations' } });
    }
  } else if (req.method === 'POST') {
    const { name, enabled, phoneNumberId, accessToken, verifyToken, businessAccountId } = req.body;

    try {
      // 1. Check current amount of WhatsApp integrations
      const currentCount = await prisma.integration.count({
        where: {
          workspaceId: workspace.id,
          provider: 'WHATSAPP'
        }
      });

      // 2. Validate against Subscription Limit
      const canAdd = await canAddWhatsAppIntegration(workspace.creator.email, currentCount);

      if (!canAdd) {
        return res.status(403).json({ error: { msg: 'LIMIT_REACHED', details: 'Please upgrade your plan to add more WhatsApp numbers.' } });
      }

      // 3. Create the new integration
      const integration = await prisma.integration.create({
        data: {
          workspaceId: workspace.id,
          provider: 'WHATSAPP',
          name: name || `WhatsApp Number ${currentCount + 1}`,
          enabled: enabled !== false,
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
      res.status(500).json({ error: { msg: 'Failed to add integration' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
