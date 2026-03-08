import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: { msg: 'Unauthorized' } });
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { role: true },
  });

  if (!admin || admin.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  if (req.method === 'GET') {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
    return res.status(200).json({ data: { configs } });
  } else if (req.method === 'POST') {
    const { key, value, category } = req.body;

    if (!key || !value) {
      return res.status(400).json({ error: { msg: 'Missing key or value' } });
    }

    try {
      const config = await prisma.systemConfig.upsert({
        where: { key },
        update: { value, category },
        create: { key, value, category: category || 'GENERAL' },
      });
      return res.status(200).json({ data: { config } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Failed to save config' } });
    }
  } else if (req.method === 'DELETE') {
    const { key } = req.body;
    try {
      await prisma.systemConfig.delete({ where: { key } });
      return res.status(200).json({ data: { success: true } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Failed to delete config' } });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: { msg: `Method ${req.method} Not Allowed` } });
  }
};

export default handler;
