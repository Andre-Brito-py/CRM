import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;
  const userId = session.user.userId; // userCode, but we need the actual id for relations.
  
  // Get actual user ID
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (method === 'GET') {
    try {
      const tickets = await prisma.supportTicket.findMany({
        where: {
          createdById: user.id,
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Get latest message for preview
          }
        }
      });
      return res.status(200).json({ tickets });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return res.status(500).json({ error: 'Error fetching tickets' });
    }
  }

  if (method === 'POST') {
    try {
      const { subject, initialMessage, workspaceId } = req.body;
      
      const ticket = await prisma.supportTicket.create({
        data: {
          subject: subject || 'New Request',
          createdById: user.id,
          workspaceId: workspaceId || null,
          messages: {
            create: {
              authorId: user.id,
              content: initialMessage,
            }
          }
        },
        include: {
          messages: true,
        }
      });
      return res.status(201).json({ ticket });
    } catch (error) {
      console.error('Error creating ticket:', error);
      return res.status(500).json({ error: 'Error creating ticket' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${method} Not Allowed`);
}
