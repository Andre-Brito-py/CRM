import { buffer } from 'micro';
import getStripe from '@/lib/server/stripe';
import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req, res) => {
  if (req.method === 'POST') {
    const requestId = String(req.headers['x-request-id'] || '').trim() || null;
    const rl = await rateLimit({ req, limit: 200, windowMs: 60_000 });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'stripe_webhook_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    const buf = await buffer(req);
    if (buf.length > 2_000_000) {
      log({ level: 'warn', msg: 'stripe_webhook_payload_too_large', requestId, bytes: buf.length });
      return res.status(413).send('Payload Too Large');
    }
    const sig = req.headers['stripe-signature'];
    const webhookSecret = await getSystemConfig('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET);

    let event;

    try {
      if (!sig || !webhookSecret) return res.status(400).send('Missing signature or secret');
      const stripe = await getStripe();
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      log({ level: 'warn', msg: 'stripe_webhook_invalid_signature', requestId });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          if (session.mode === 'subscription') {
            await handleSubscriptionCreated({ requestId, session });
          }
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object;
          await handleSubscriptionUpdated({ requestId, subscription });
          break;
        case 'invoice.paid':
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          await handleInvoicePaid({ requestId, invoice });
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          await handleInvoicePaymentFailed({ requestId, invoice });
          break;
        }
        default:
          log({ level: 'info', msg: 'stripe_webhook_unhandled_event', requestId, eventType: event.type });
      }

      res.status(200).json({ received: true });
    } catch (error) {
      log({ level: 'error', msg: 'stripe_webhook_handler_failed', requestId, eventType: event?.type, error });
      reportError(error, { route: '/api/webhooks/stripe', requestId, eventType: event?.type });
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
};

const resolveSubscriptionTypeFromStripe = async (stripe, subscription) => {
  const priceId = subscription?.items?.data?.[0]?.price?.id;
  if (!priceId) return null;
  const price = await stripe.prices.retrieve(priceId);
  const product = await stripe.products.retrieve(price.product);
  return product?.metadata?.type?.toUpperCase() || 'STANDARD';
};

const shouldDowngradeFromStripeStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  return ['canceled', 'unpaid', 'incomplete_expired'].includes(normalized);
};

async function handleSubscriptionCreated({ requestId, session }) {
  const customerId = session.customer;
  const metadata = session.metadata;

  if (metadata?.type) {
    const type = metadata.type.toUpperCase();
    await prisma.customerPayment.updateMany({
      where: { paymentId: customerId },
      data: { subscriptionType: type },
    });
    log({ level: 'info', msg: 'stripe_subscription_created', requestId, customerId, subscriptionType: type });
  }
}

async function handleSubscriptionUpdated({ requestId, subscription }) {
  const customerId = subscription.customer;
  const status = subscription.status;

  if (shouldDowngradeFromStripeStatus(status)) {
    await prisma.customerPayment.updateMany({
      where: { paymentId: customerId },
      data: { subscriptionType: 'FREE' },
    });
    log({ level: 'info', msg: 'stripe_subscription_downgraded', requestId, customerId, subscriptionType: 'FREE', status });
  } else if (status === 'active' || status === 'trialing') {
    const stripe = await getStripe();
    const type = await resolveSubscriptionTypeFromStripe(stripe, subscription);
    if (!type) return;

    await prisma.customerPayment.updateMany({
      where: { paymentId: customerId },
      data: { subscriptionType: type },
    });
    log({ level: 'info', msg: 'stripe_subscription_updated', requestId, customerId, subscriptionType: type, status });
  }
}

async function handleInvoicePaid({ requestId, invoice }) {
  const customerId = invoice?.customer || null;
  const subscriptionId = invoice?.subscription || null;
  if (!customerId || !subscriptionId) return;

  const stripe = await getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionUpdated({ requestId, subscription });
}

async function handleInvoicePaymentFailed({ requestId, invoice }) {
  const customerId = invoice?.customer || null;
  if (!customerId) return;

  const attemptCount = Number(invoice?.attempt_count || 0);
  if (attemptCount < 3) {
    log({ level: 'info', msg: 'stripe_invoice_payment_failed_grace', requestId, customerId, attemptCount });
    return;
  }

  await prisma.customerPayment.updateMany({
    where: { paymentId: customerId },
    data: { subscriptionType: 'FREE' },
  });

  log({ level: 'info', msg: 'stripe_invoice_payment_failed_downgrade', requestId, customerId, attemptCount });
}

export default handler;
