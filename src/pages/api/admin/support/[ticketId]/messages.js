import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if admin
  if (session.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { method } = req;
  const { ticketId } = req.query;

  const adminUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
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
          authorId: adminUser.id
        },
        include: {
           author: { select: { name: true, image: true, role: true } }
        }
      });
      
      // Update ticket status to in progress if it was open
      if (ticket.status === 'OPEN') {
         await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { status: 'IN_PROGRESS' }
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
