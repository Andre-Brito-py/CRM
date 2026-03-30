import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;
  const { ticketId } = req.query;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Ensure ticket exists and user owns it
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket || ticket.createdById !== user.id) {
    return res.status(404).json({ error: 'Ticket not found or access denied' });
  }

  if (method === 'GET') {
    try {
      const messages = await prisma.supportMessage.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { name: true, image: true, role: true } }
        }
      });
      return res.status(200).json({ messages });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error fetching messages' });
    }
  }

  if (method === 'POST') {
    try {
      const { content } = req.body;
      const message = await prisma.supportMessage.create({
        data: {
          ticketId,
          content,
          authorId: user.id
        },
        include: {
           author: { select: { name: true, image: true, role: true } }
        }
      });

      // Optionally reopen ticket if user replies
      if (ticket.status === 'CLOSED') {
         await prisma.supportTicket.update({
           where: { id: ticket.id },
           data: { status: 'OPEN' }
         });
      }

      return res.status(201).json({ message });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error creating message' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${method} Not Allowed`);
}
