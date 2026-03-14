import prisma from '@/prisma/index';
import webPush from 'web-push';
import { getSystemConfig } from '@/lib/server/config';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'POST') {
    const { title, body, url, userId } = req.body;

    try {
      const [email, publicKey, privateKey] = await Promise.all([
        getSystemConfig('WEB_PUSH_EMAIL', process.env.WEB_PUSH_EMAIL),
        getSystemConfig('VAPID_PUBLIC_KEY', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        getSystemConfig('VAPID_PRIVATE_KEY', process.env.VAPID_PRIVATE_KEY),
      ]);

      if (!email || !publicKey || !privateKey) {
        return res.status(500).json({ error: 'Web push is not configured' });
      }

      webPush.setVapidDetails(email, publicKey, privateKey);

      // Find subscriptions for the user
      // If userId is provided, send to that user. Otherwise send to current user.
      const targetUserId = userId || session.user.userId;

      const subscriptions = await prisma.notificationSubscription.findMany({
        where: {
          userId: targetUserId,
        },
      });

      if (subscriptions.length === 0) {
        return res.status(404).json({ message: 'No subscriptions found for user' });
      }

      const payload = JSON.stringify({
        title: title || 'Test Notification',
        body: body || 'This is a test notification from Closify.',
        url: url || '/',
      });

      const results = await Promise.all(
        subscriptions.map((sub) =>
          webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload
          ).catch((err) => {
            if (err.statusCode === 410) {
              // Subscription expired, delete it
              return prisma.notificationSubscription.delete({
                where: { id: sub.id },
              });
            }
            console.error('Error sending notification', err);
            return err;
          })
        )
      );

      return res.status(200).json({ results });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to send notification' });
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
