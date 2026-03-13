import { getSession } from 'next-auth/react';
import { markAsRead } from '@/prisma/services/notification';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).end();
    return;
  }

  const { notificationId } = req.query;

  if (req.method === 'PUT') {
    try {
      await markAsRead(notificationId);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
