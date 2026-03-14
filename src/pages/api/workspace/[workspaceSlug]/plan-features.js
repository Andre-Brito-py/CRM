import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';
import { getWorkspaceLimits, getTrialStatus } from '@/lib/server/subscription';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: { msg: 'Unauthorized' } });
  }

  const { workspaceSlug } = req.query;

  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: { some: { email: session.user.email, deletedAt: null } },
      },
      select: { id: true },
    });

    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    const limits = await getWorkspaceLimits(workspace.id);
    const trialStatus = await getTrialStatus(workspace.id);

    return res.status(200).json({
      data: {
        plan: limits.plan,
        allowedModules: limits.allowedModules,
        freeTrialDays: limits.freeTrialDays,
        trial: trialStatus,
        limits: {
          members: limits.members,
          contacts: limits.contacts,
          automations: limits.automations,
          aiRequests24h: limits.aiRequests24h,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching plan features:', error);
    return res.status(500).json({ error: { msg: 'Internal server error' } });
  }
}
