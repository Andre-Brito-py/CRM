import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { sendMail } from '@/lib/server/mail';
import { sendWhatsAppMessage } from '@/lib/server/whatsapp';

const DEFAULT_QUESTION = 'Em uma escala de 0 a 10, o quanto você recomendaria nossa empresa para um amigo?';

const buildPublicUrl = (req, path) => {
  const proto = `${req.headers['x-forwarded-proto'] || 'https'}`.split(',')[0].trim();
  const host = `${req.headers['x-forwarded-host'] || req.headers.host}`.split(',')[0].trim();
  return `${proto}://${host}${path}`;
};

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;

  if (method !== 'POST') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

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

  try {
    const {
      surveyId,
      contactId: rawContactId,
      dealId,
      channel = 'link',
      integrationId,
      message,
      subject,
    } = req.body || {};

    if (!surveyId) {
      return res.status(400).json({ error: { msg: 'surveyId is required' } });
    }

    let contactId = rawContactId || null;
    if (!contactId && dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: dealId, workspaceId: workspace.id },
        select: { id: true, contactId: true },
      });
      contactId = deal?.contactId || null;
    }

    if (!contactId) {
      return res.status(400).json({ error: { msg: 'contactId or dealId is required' } });
    }

    const [survey, contact] = await Promise.all([
      prisma.npsSurvey.findFirst({
        where: { id: surveyId, workspaceId: workspace.id },
        select: { id: true, name: true },
      }),
      prisma.contact.findFirst({
        where: { id: contactId, workspaceId: workspace.id },
        select: { id: true, name: true, email: true, phone: true },
      }),
    ]);

    if (!survey) {
      return res.status(404).json({ error: { msg: 'Survey not found' } });
    }
    if (!contact) {
      return res.status(404).json({ error: { msg: 'Contact not found' } });
    }

    const link = buildPublicUrl(req, `/nps/respond/${survey.id}/${contact.id}`);
    const body = `${message ? `${message}\n\n` : ''}${DEFAULT_QUESTION}\n\n${link}`;

    if (channel === 'link') {
      return res.status(200).json({ data: { link } });
    }

    if (channel === 'whatsapp') {
      if (!integrationId) {
        return res.status(400).json({ error: { msg: 'integrationId is required for whatsapp' } });
      }
      if (!contact.phone) {
        return res.status(400).json({ error: { msg: 'Contact has no phone number' } });
      }

      const externalId = await sendWhatsAppMessage(integrationId, contact.phone, body);
      return res.status(200).json({ data: { link, externalId } });
    }

    if (channel === 'email') {
      if (!contact.email) {
        return res.status(400).json({ error: { msg: 'Contact has no email address' } });
      }

      await sendMail({
        to: contact.email,
        subject: subject || `Pesquisa NPS - ${survey.name}`,
        text: body,
        html: `<p>${(message || '').replace(/\n/g, '<br/>')}</p><p>${DEFAULT_QUESTION}</p><p><a href="${link}">${link}</a></p>`,
      });

      return res.status(200).json({ data: { link } });
    }

    return res.status(400).json({ error: { msg: 'Invalid channel' } });
  } catch (error) {
    console.error('sendNpsSurvey error:', error);
    return res.status(500).json({ error: { msg: 'Unable to send NPS survey' } });
  }
};

export default handler;

