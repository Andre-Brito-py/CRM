import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';
import { processDueAutomationJobs } from '@/prisma/services/automation';
import { createPlatformAuditActivity } from '@/prisma/services/activity';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: 'Method not supported' } });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: { msg: 'Unauthorized' } });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { role: true, email: true },
  });
  if (!user || user.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  try {
    const lockKey = 'admin:run-automation-jobs';
    const lockRows = await prisma.$queryRaw`SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked`;
    const locked = Boolean(lockRows?.[0]?.locked);
    if (!locked) {
      return res.status(200).json({ data: { skipped: true, reason: 'locked' } });
    }

    const result = await processDueAutomationJobs();

    await createPlatformAuditActivity(
      session.user.userId || session.user.id,
      session.user.email || user.email,
      {
        action: 'RUN_AUTOMATION_JOBS',
        title: 'Admin ran automation jobs',
        target: null,
        metadata: { result },
      },
      req
    );

    return res.status(200).json({ data: { result } });
  } catch (error) {
    return res.status(500).json({ error: { msg: error?.message || 'Failed to run automation jobs' } });
  } finally {
    try {
      const lockKey = 'admin:run-automation-jobs';
      await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
    } catch {
      null;
    }
  }
}

