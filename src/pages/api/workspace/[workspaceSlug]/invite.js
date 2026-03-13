import {
  validateWorkspaceInvite,
  validateSession,
} from '@/config/api-validation/index';
import prisma from '@/prisma/index';
import { inviteUsers, getWorkspace } from '@/prisma/services/workspace';
import { createAuditActivity } from '@/prisma/services/activity';
import { getSubscriptionStatus } from '@/lib/server/subscription';
import { rateLimit } from '@/lib/server/rateLimit';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'POST') {
    const session = await validateSession(req, res);
    await validateWorkspaceInvite(req, res);
    const { members } = req.body;
    const workspace = await getWorkspace(session.user.userId, session.user.email, req.query.workspaceSlug);
    if (!workspace?.id) {
      return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
    }

    const userId = session.user.userId || session.user.id;
    const rl = await rateLimit({ req, limit: 10, windowMs: 60_000, key: `u:${userId}:members:invite:1m` });
    if (!rl.ok) {
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    const creatorEmail = workspace?.creator?.email || session.user.email;
    const requestedEmails = Array.isArray(members)
      ? members.map((m) => String(m?.email || '').trim().toLowerCase()).filter(Boolean)
      : [];
    const uniqueEmails = [...new Set(requestedEmails)];

    if (uniqueEmails.length > 0) {
      const [plan, currentMemberCount, existingCount] = await Promise.all([
        getSubscriptionStatus(creatorEmail),
        prisma.member.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
        prisma.member.count({
          where: { workspaceId: workspace.id, deletedAt: null, email: { in: uniqueEmails } },
        }),
      ]);

      const memberLimit = plan === 'FREE' ? 3 : plan === 'STANDARD' ? 10 : null;
      const toAdd = Math.max(0, uniqueEmails.length - existingCount);

      if (memberLimit && currentMemberCount + toAdd > memberLimit) {
        return res.status(403).json({
          error: {
            msg: 'LIMIT_REACHED',
            details:
              'Você atingiu o limite de membros do seu plano. Faça um upgrade para convidar mais pessoas.',
          },
        });
      }
    }

    await inviteUsers(
      session.user.userId,
      session.user.email,
      members,
      req.query.workspaceSlug
    )
      .then(async (members) => {
        if (workspace?.id) {
          await createAuditActivity(
            workspace.id,
            session.user.userId,
            {
              action: 'MEMBER_INVITE',
              title: 'Members invited',
              metadata: {
                count: Array.isArray(members) ? members.length : 0,
                members: Array.isArray(members)
                  ? members.map((m) => ({ email: m.email, teamRole: m.teamRole }))
                  : [],
              },
            },
            req
          );
        }
        res.status(200).json({ data: { members } });
      })
      .catch((error) =>
        res.status(404).json({ errors: { error: { msg: error.message } } })
      );
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
