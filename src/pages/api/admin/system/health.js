import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';
import os from 'os';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { role: true },
  });

  if (!user || user.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  const start = Date.now();
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error';
  }
  const dbLatency = Date.now() - start;

  const health = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: os.loadavg(),
    platform: process.platform,
    nodeVersion: process.version,
    dbStatus,
    dbLatency,
    timestamp: new Date().toISOString(),
  };

  res.status(200).json({ data: health });
}
