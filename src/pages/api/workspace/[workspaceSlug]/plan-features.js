import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { getWorkspaceLimits, getTrialStatus } from '@/lib/server/subscription';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

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
          pendingInvites: limits.pendingInvites,
          contacts: limits.contacts,
          automations: limits.automations,
          aiRequests24h: limits.aiRequests24h,
          aiTokens24h: limits.aiTokens24h,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching plan features:', error);
    return res.status(500).json({ error: { msg: 'Internal server error' } });
  }
}
