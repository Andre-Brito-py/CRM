import {
  validateWorkspaceInvite,
  validateSession,
} from '@/config/api-validation/index';
import { inviteUsers, getWorkspace } from '@/prisma/services/workspace';
import { createAuditActivity } from '@/prisma/services/activity';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'POST') {
    const session = await validateSession(req, res);
    await validateWorkspaceInvite(req, res);
    const { members } = req.body;
    const workspace = await getWorkspace(session.user.userId, session.user.email, req.query.workspaceSlug);
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
