import { buffer } from 'micro';
import prisma from '@/prisma/index';
import { resolveWebhookProvider } from '@/lib/server/payment-providers/resolver';
import { processAutomation } from '@/prisma/services/automation';
import { rateLimit } from '@/lib/server/rateLimit';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const rl = rateLimit({ req, limit: 300, windowMs: 60_000 });
  if (!rl.ok) {
    return res.status(429).json({ error: { msg: 'Too Many Requests' } });
  }

  const rawBody = await buffer(req);
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

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: result.status || payment.status,
        providerPaymentId: payment.providerPaymentId || result.providerPaymentId,
        paymentLink: payment.paymentLink || payment.invoiceUrl || payment.paymentUrl || null,
      },
    });

    const trigger = triggerFromWebhook(result.status);
    if (trigger) {
      processAutomation(updated.workspaceId, trigger, {
        paymentId: updated.id,
        payment: updated,
        contactId: updated.contactId,
        dealId: updated.dealId,
      }).catch((err) => console.error(`processAutomation ${trigger} failed:`, err));
    }

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

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Payments webhook error:', error);
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({ error: { msg: error?.message || 'Webhook handler failed' } });
  }
}
