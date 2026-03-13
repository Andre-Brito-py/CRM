import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { getWorkspace, isWorkspaceCreator, isWorkspaceOwner } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: { msg: `Method ${req.method} Not Allowed` } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const { workspaceSlug } = req.query;
  const userId = session.user.userId || session.user.id;
  const email = session.user.email;

  const workspace = await getWorkspace(userId, email, workspaceSlug);
  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  const allowed =
    isWorkspaceCreator(userId, workspace.creatorId) ||
    isWorkspaceOwner(email, workspace);

  if (!allowed) {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  const workspaceId = workspace.id;
  const exportedAt = new Date().toISOString();

  const [
    workspaceRow,
    members,
    domains,
    tags,
    companies,
    contacts,
    pipelines,
    stages,
    deals,
    tasks,
    conversations,
    messages,
    payments,
    activities,
    messageTemplates,
    automations,
    automationJobs,
    npsSurveys,
    npsResponses,
    webhooks,
    webhookDeliveries,
    apiKeys,
    integrations,
    paymentSetting,
    platformSubscription,
  ] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true, deletedAt: true },
    }),
    prisma.member.findMany({
      where: { workspaceId },
      orderBy: { invitedAt: 'asc' },
      select: {
        id: true,
        email: true,
        inviter: true,
        status: true,
        teamRole: true,
        invitedAt: true,
        joinedAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    }),
    prisma.domain.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.tag.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.company.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.contact.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.pipeline.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.stage.findMany({
      where: { pipeline: { workspaceId } },
      orderBy: { order: 'asc' },
    }),
    prisma.deal.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.task.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.conversation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.message.findMany({
      where: { conversation: { workspaceId } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.payment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.activity.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.messageTemplate.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.automationRule.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.automationJob.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.npsSurvey.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.npsResponse.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.webhook.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true, events: true, isActive: true, createdAt: true, updatedAt: true, deletedAt: true },
    }),
    prisma.webhookDelivery.findMany({
      where: { webhook: { workspaceId } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.apiKey.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, createdAt: true, updatedAt: true, deletedAt: true },
    }),
    prisma.integration.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, provider: true, name: true, enabled: true, createdAt: true, updatedAt: true },
    }),
    prisma.workspacePaymentSetting.findUnique({
      where: { workspaceId },
    }),
    prisma.platformSubscription.findUnique({
      where: { workspaceId },
    }),
  ]);

  const payload = {
    exportedAt,
    workspace: workspaceRow,
    members,
    domains,
    tags,
    companies,
    contacts,
    pipelines,
    stages,
    deals,
    tasks,
    conversations,
    messages,
    payments,
    activities,
    messageTemplates,
    automations,
    automationJobs,
    npsSurveys,
    npsResponses,
    webhooks,
    webhookDeliveries,
    apiKeys,
    integrations,
    paymentSetting,
    platformSubscription,
  };

  const safeSlug = String(workspaceRow?.slug || workspaceSlug || 'workspace')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="export-${safeSlug}-${exportedAt.slice(0, 10)}.json"`);
  return res.status(200).send(JSON.stringify(payload));
};

export default handler;

