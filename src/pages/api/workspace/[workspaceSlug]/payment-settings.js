import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation/index';
import { createAuditActivity } from '@/prisma/services/activity';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;

  const session = await validateSession(req, res);
  if (!session) return;

  const workspace = await getWorkspace(
    session.user.userId || session.user.id,
    session.user.email,
    workspaceSlug
  );

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  const isOwner = isWorkspaceOwner(session.user.email, workspace);
  if (!isOwner) {
    return res.status(403).json({ error: { msg: 'Only workspace owners can manage payment settings' } });
  }

  if (method === 'GET') {
    const setting = await prisma.workspacePaymentSetting.findUnique({
      where: { workspaceId: workspace.id },
      select: {
        providerAccountId: true,
        updatedAt: true,
        provider: { select: { name: true, displayName: true, status: true } },
      },
    });

    return res.status(200).json({
      data: {
        paymentSetting: setting
          ? {
            providerAccountId: setting.providerAccountId,
            updatedAt: setting.updatedAt,
            provider: setting.provider,
          }
          : null,
      },
    });
  }

  if (method === 'PUT') {
    const providerAccountIdRaw = req.body?.providerAccountId;
    const providerAccountId =
      providerAccountIdRaw == null || String(providerAccountIdRaw).trim() === ''
        ? null
        : String(providerAccountIdRaw).trim();

    const existing = await prisma.workspacePaymentSetting.findUnique({
      where: { workspaceId: workspace.id },
      select: { id: true },
    });

    if (!existing) {
      return res.status(400).json({
        error: {
          code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
          msg: 'Gateway de pagamento não habilitado para este workspace. Contate o suporte.',
        },
      });
    }

    const saved = await prisma.workspacePaymentSetting.update({
      where: { workspaceId: workspace.id },
      data: { providerAccountId },
      select: {
        workspaceId: true,
        providerAccountId: true,
        updatedAt: true,
        provider: { select: { name: true, displayName: true, status: true } },
      },
    });

    await createAuditActivity(
      workspace.id,
      session.user.userId || session.user.id,
      {
        action: 'WORKSPACE_PAYMENT_ACCOUNT_UPDATE',
        title: 'Workspace payout account updated',
        metadata: { providerAccountId: saved.providerAccountId },
      },
      req
    );

    return res.status(200).json({ data: { paymentSetting: saved } });
  }

  return res.status(405).json({ error: { msg: 'Method not supported' } });
};

export default handler;
