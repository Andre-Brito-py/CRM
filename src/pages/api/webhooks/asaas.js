import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
import { processAutomation } from '@/prisma/services/automation';
import { log, reportError } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';
import { sendWhatsAppMessage } from '@/lib/server/whatsapp';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

const mapAsaasStatusToLocal = (asaasStatus) => {
  const status = String(asaasStatus || '').toUpperCase();
  if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status)) return 'PAID';
  if (['CANCELLED', 'DELETED'].includes(status)) return 'CANCELED';
  if (['OVERDUE', 'REFUNDED', 'CHARGEBACK'].includes(status)) return 'FAILED';
  return 'PENDING';
};

const shouldTriggerPaid = (oldStatus, newStatus) => oldStatus !== 'PAID' && newStatus === 'PAID';
const shouldTriggerFailed = (oldStatus, newStatus) =>
  oldStatus !== newStatus && (newStatus === 'FAILED' || newStatus === 'CANCELED');

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const rl = await rateLimit({ req, limit: 600, windowMs: 60_000 });
  if (!rl.ok) {
    log({ level: 'warn', msg: 'asaas_webhook_rate_limited', requestId });
    return res.status(429).json({ error: { msg: 'Too Many Requests' } });
  }

  const expectedToken = await getSystemConfig('ASAAS_WEBHOOK_TOKEN', process.env.ASAAS_WEBHOOK_TOKEN);
  const receivedToken = req.headers['asaas-access-token'];

  if (expectedToken && receivedToken !== expectedToken) {
    return res.status(401).json({ error: { msg: 'Invalid webhook token' } });
  }

  const payload = req.body || {};
  const eventType = payload?.event || payload?.type || null;
  const payment = payload?.payment || payload?.data?.payment || payload?.paymentDto || null;

  if (!payment?.id) {
    return res.status(200).json({ received: true });
  }

  try {
    const existing =
      (await prisma.payment.findFirst({
        where: { asaasPaymentId: payment.id },
      })) ||
      (payment.externalReference
        ? await prisma.payment.findFirst({
          where: { id: payment.externalReference },
        })
        : null);

    if (!existing) {
      return res.status(200).json({ received: true });
    }

    const nextStatus = mapAsaasStatusToLocal(payment.status || eventType);

    const updated = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        asaasPaymentId: payment.id,
        asaasCustomerId: payment.customer || existing.asaasCustomerId,
        invoiceUrl: payment.invoiceUrl || existing.invoiceUrl,
        paymentUrl: payment.invoiceUrl || existing.paymentUrl,
        dueDate: payment.dueDate ? new Date(payment.dueDate) : existing.dueDate,
        status: nextStatus,
      },
    });

    if (shouldTriggerPaid(existing.status, updated.status)) {
      // 1. Send automatic confirmation message via Chat (WhatsApp)
      if (updated.contactId) {
        try {
          // Find the active WhatsApp conversation
          const conversation = await prisma.conversation.findFirst({
            where: { 
              workspaceId: updated.workspaceId, 
              contactId: updated.contactId, 
              platform: 'WHATSAPP',
              deletedAt: null
            },
            orderBy: { updatedAt: 'desc' }
          });

          if (conversation && conversation.externalId) {
            // Find active WhatsApp integration
            const integration = await prisma.integration.findFirst({
              where: { workspaceId: updated.workspaceId, provider: 'whatsapp', enabled: true }
            });

            if (integration) {
              const amountFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(updated.value));
              const text = `✅ *Pagamento Confirmado!*\n\nOlá! Recebemos a confirmação do seu pagamento no valor de *${amountFormatted}* referente a: _${updated.description || 'Produto/Serviço'}_.\n\nObrigado pela preferência! 🚀`;

              await sendWhatsAppMessage(integration.id, conversation.externalId, text, { workspaceId: updated.workspaceId });

              // Log the message in our conversation history
              await prisma.message.create({
                data: {
                  conversationId: conversation.id,
                  direction: 'OUTBOUND',
                  type: 'TEXT',
                  content: text,
                  status: 'SENT'
                }
              });
              
              // Update conversation timestamp
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { updatedAt: new Date() }
              });
            }
          }
        } catch (msgError) {
          log({ level: 'error', msg: 'webhook_auto_reply_failed', workspaceId: updated.workspaceId, paymentId: updated.id, error: msgError.message });
        }
      }

      processAutomation(updated.workspaceId, 'PAYMENT_PAID', {
        paymentId: updated.id,
        payment: updated,
        contactId: updated.contactId,
        dealId: updated.dealId,
      }).catch((err) => {
        log({ level: 'error', msg: 'automation_payment_paid_failed', requestId, workspaceId: updated.workspaceId, paymentId: updated.id, error: err });
        reportError(err, { route: 'automation:PAYMENT_PAID', requestId, workspaceId: updated.workspaceId, paymentId: updated.id });
      });
    }

    if (shouldTriggerFailed(existing.status, updated.status)) {
      processAutomation(updated.workspaceId, 'PAYMENT_FAILED', {
        paymentId: updated.id,
        payment: updated,
        contactId: updated.contactId,
        dealId: updated.dealId,
      }).catch((err) => {
        log({ level: 'error', msg: 'automation_payment_failed_failed', requestId, workspaceId: updated.workspaceId, paymentId: updated.id, error: err });
        reportError(err, { route: 'automation:PAYMENT_FAILED', requestId, workspaceId: updated.workspaceId, paymentId: updated.id });
      });
    }

    await prisma.activity.create({
      data: {
        workspaceId: updated.workspaceId,
        type: 'PAYMENT_UPDATED',
        title: `Payment ${updated.status}`,
        content: updated.paymentUrl || updated.invoiceUrl || undefined,
        contactId: updated.contactId,
        dealId: updated.dealId,
      },
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    log({ level: 'error', msg: 'asaas_webhook_handler_failed', requestId, eventType, paymentId: payment.id, error });
    reportError(error, { route: '/api/webhooks/asaas', requestId, eventType, paymentId: payment.id });
    return res.status(500).json({ error: { msg: 'Webhook handler failed' } });
  }
};

export default handler;
