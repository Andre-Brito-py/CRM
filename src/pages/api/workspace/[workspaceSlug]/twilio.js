import { validateSession } from '@/config/api-validation';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'PUT') {
    const session = await validateSession(req, res);
    if (!session) return;

    const { workspaceSlug } = req.query;
    const {
      twilioAccountSid,
      twilioAuthToken,
      twilioApiKey,
      twilioApiSecret,
      twilioTwimlAppSid,
      twilioPhoneNumber,
    } = req.body;

    const workspace = await getWorkspace(
      session.user.userId || session.user.id,
      session.user.email,
      workspaceSlug
    );

    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    const isOwner = isWorkspaceOwner(session.user.email, workspace);
    if (!isOwner) {
      return res.status(403).json({ error: { msg: 'Somente administradores podem configurar o Twilio.' } });
    }

    try {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          twilioAccountSid: twilioAccountSid || null,
          twilioAuthToken: twilioAuthToken || null,
          twilioApiKey: twilioApiKey || null,
          twilioApiSecret: twilioApiSecret || null,
          twilioTwimlAppSid: twilioTwimlAppSid || null,
          twilioPhoneNumber: twilioPhoneNumber || null,
        },
      });

      res.status(200).json({
        data: {
          twilioAccountSid,
          twilioAuthToken: twilioAuthToken ? '••••••••' : null,
          twilioApiKey: twilioApiKey ? '••••••••' : null,
          twilioApiSecret: twilioApiSecret ? '••••••••' : null,
          twilioTwimlAppSid,
          twilioPhoneNumber,
        },
      });
    } catch (error) {
      res.status(500).json({ error: { msg: error.message } });
    }
  } else {
    res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
