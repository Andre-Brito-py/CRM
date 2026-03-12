import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
import { processAutomation } from '@/prisma/services/automation';

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
      processAutomation(updated.workspaceId, 'PAYMENT_PAID', {
        paymentId: updated.id,
        payment: updated,
        contactId: updated.contactId,
        dealId: updated.dealId,
      }).catch((err) => console.error('processAutomation PAYMENT_PAID failed:', err));
    }

    if (shouldTriggerFailed(existing.status, updated.status)) {
      processAutomation(updated.workspaceId, 'PAYMENT_FAILED', {
        paymentId: updated.id,
        payment: updated,
        contactId: updated.contactId,
        dealId: updated.dealId,
      }).catch((err) => console.error('processAutomation PAYMENT_FAILED failed:', err));
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
    console.error('Asaas webhook handler error:', error);
    return res.status(500).json({ error: { msg: 'Webhook handler failed' } });
  }
};

export default handler;

