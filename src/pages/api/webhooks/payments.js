import { buffer } from 'micro';
import prisma from '@/prisma/index';
import { resolveWebhookProvider } from '@/lib/server/payment-providers/resolver';
import { processAutomation } from '@/prisma/services/automation';
import { rateLimit } from '@/lib/server/rateLimit';
import { ensureRequestId } from '@/lib/server/request-id';
import { log, reportError } from '@/lib/server/logger';

export const config = {
  api: {
    bodyParser: false,
  },
};

const triggerFromWebhook = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAID') return 'PAYMENT_PAID';
  if (normalized === 'FAILED' || normalized === 'CANCELED') return 'PAYMENT_FAILED';
  return null;
};

const normalizePaymentStatus = (status) => String(status || '').trim().toUpperCase();

export default async function handler(req, res) {
  const requestId = ensureRequestId(req, res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const rl = await rateLimit({ req, limit: 300, windowMs: 60_000 });
  if (!rl.ok) {
    log({ level: 'warn', msg: 'payments webhook rate limited', requestId });
    return res.status(429).json({ error: { msg: 'Too Many Requests' } });
  }

  const rawBody = await buffer(req);
  if (rawBody.length > 2_000_000) {
    log({ level: 'warn', msg: 'payments webhook payload too large', requestId, bytes: rawBody.length });
    return res.status(413).json({ error: { msg: 'Payload Too Large' } });
  }
  const parsedBody = (() => {
    try {
      return JSON.parse(rawBody.toString('utf8') || '{}');
    } catch {
      return {};
    }
  })();
  req.body = parsedBody;

  try {
    const provider = await resolveWebhookProvider({ req, providerName: req.query?.provider });
    const result = await provider.handleWebhook({ req, rawBody });

    if (!result?.providerPaymentId) {
      return res.status(200).json({ received: true });
    }

    const providerId = provider?.provider?.id || null;
    const providerName = String(provider?.provider?.name || '').toLowerCase();

    const payment =
      (providerId
        ? await prisma.payment.findFirst({
          where: { providerId, providerPaymentId: result.providerPaymentId },
        })
        : null) ||
      (result?.externalReference
        ? await prisma.payment.findFirst({
          where: {
            workspaceId: result?.workspaceId || undefined,
            OR: [{ id: String(result.externalReference) }, { externalReference: String(result.externalReference) }],
          },
        })
        : null) ||
      (providerName === 'asaas'
        ? await prisma.payment.findFirst({
          where: { asaasPaymentId: result.providerPaymentId },
        })
        : null);

    if (!payment) {
      return res.status(200).json({ received: true });
    }

    const nextStatusRaw = result.status || payment.status;
    const nextStatus = normalizePaymentStatus(nextStatusRaw);
    const prevStatus = normalizePaymentStatus(payment.status);
    const statusChanged = Boolean(nextStatus && nextStatus !== prevStatus);

    const nextProviderPaymentId = payment.providerPaymentId || result.providerPaymentId || null;
    const providerPaymentIdChanged = Boolean(nextProviderPaymentId && nextProviderPaymentId !== payment.providerPaymentId);

    const nextPaymentLink =
      payment.paymentLink ||
      result?.invoiceUrl ||
      result?.paymentUrl ||
      payment.invoiceUrl ||
      payment.paymentUrl ||
      null;
    const paymentLinkChanged = Boolean(nextPaymentLink && nextPaymentLink !== payment.paymentLink);

    if (!statusChanged && !providerPaymentIdChanged && !paymentLinkChanged) {
      return res.status(200).json({ received: true });
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: statusChanged ? nextStatus : payment.status,
        providerPaymentId: nextProviderPaymentId,
        paymentLink: nextPaymentLink,
      },
    });

    const trigger = statusChanged ? triggerFromWebhook(nextStatus) : null;
    if (trigger && updated?.workspaceId) {
      processAutomation(updated.workspaceId, trigger, {
        paymentId: updated.id,
        payment: updated,
        contactId: updated.contactId,
        dealId: updated.dealId,
      }).catch((err) =>
        log({
          level: 'error',
          msg: 'processAutomation failed',
          requestId,
          trigger,
          workspaceId: updated.workspaceId,
          err,
        })
      );
    }

    if (statusChanged) {
      await prisma.activity.create({
        data: {
          workspaceId: updated.workspaceId,
          type: 'PAYMENT_UPDATED',
          title: `Payment ${updated.status}`,
          content: updated.paymentLink || updated.paymentUrl || updated.invoiceUrl || undefined,
          contactId: updated.contactId,
          dealId: updated.dealId,
        },
      });

      if (nextStatus === 'PAID' && updated.contactId) {
        const conversation = await prisma.conversation.findFirst({
          where: { contactId: updated.contactId, status: 'OPEN', autopilotEnabled: true },
          orderBy: { updatedAt: 'desc' },
        });
        if (conversation) {
          const workspace = await prisma.workspace.findUnique({ where: { id: updated.workspaceId } });
          const contact = await prisma.contact.findUnique({ where: { id: updated.contactId } });
          if (workspace && contact) {
            const msg = await prisma.message.create({
              data: {
                conversationId: conversation.id,
                direction: 'INBOUND',
                type: 'TEXT',
                content: `[SISTEMA]: O pagamento do serviço "${updated.description || 'agendado'}" foi recebido e confirmado com sucesso. Envie uma mensagem curta e amigável confirmando ao cliente que está tudo certo com o agendamento/serviço.`,
                status: 'RECEIVED',
              },
            });
            const { processAutopilotReply } = await import('@/lib/server/autopilot');
            processAutopilotReply({ workspace, conversation, contact, message: msg }).catch((err) => {
              log({ level: 'error', msg: 'autopilot_trigger_payment_paid_failed', err });
            });
          }
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    log({ level: 'error', msg: 'payments webhook error', requestId, err: error });
    reportError(error, { requestId, route: 'webhooks/payments', provider: req.query?.provider });
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({ error: { msg: error?.message || 'Webhook handler failed' } });
  }
}
