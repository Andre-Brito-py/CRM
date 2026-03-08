import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { subscription, workspaceId } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    try {
      await prisma.notificationSubscription.upsert({
        where: {
          endpoint: subscription.endpoint,
        },
        update: {
          keys: subscription.keys,
          updatedAt: new Date(),
          workspace: {
            connect: { id: workspaceId }
          }
        },
        create: {
          userId: session.user.userId,
          workspaceId: workspaceId,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
      });

      return res.status(200).json({ message: 'Subscribed successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to subscribe' });
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
