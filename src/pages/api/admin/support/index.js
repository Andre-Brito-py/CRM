import { getSession } from 'next-auth/react';
import prisma from '@/lib/prisma';

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
  const { status } = req.query; // optional filter

  if (method === 'GET') {
    try {
      const tickets = await prisma.supportTicket.findMany({
        where: {
          deletedAt: null,
          ...(status ? { status } : {})
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          createdBy: { select: { name: true, email: true, image: true } },
          assignee: { select: { name: true, email: true } },
          workspace: { select: { name: true, slug: true } }
        }
      });
      return res.status(200).json({ tickets });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error fetching tickets' });
    }
  }

  if (method === 'PUT') {
    // Allows updating status or assigning
    try {
       const { ticketId, statusToUpdate, assigneeId } = req.body;
       const ticket = await prisma.supportTicket.update({
         where: { id: ticketId },
         data: {
            ...(statusToUpdate && { status: statusToUpdate }),
            ...(assigneeId !== undefined && { assigneeId: assigneeId || null })
         }
       });
       return res.status(200).json({ ticket });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error updating ticket' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${method} Not Allowed`);
}
