import { buffer } from 'micro';

import getStripe from '@/lib/server/stripe';
import { getSystemConfig } from '@/lib/server/config';
import prisma from '@/prisma/index';
import { rateLimit } from '@/lib/server/rateLimit';
import { log } from '@/lib/server/logger';

export const config = { api: { bodyParser: false } };

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

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const rl = await rateLimit({ req, limit: 200, windowMs: 60_000 });
  if (!rl.ok) {
    log({ level: 'warn', msg: 'payments_hooks_rate_limited', requestId });
    return res.status(429).send('Too Many Requests');
  }

  const reqBuffer = await buffer(req);
  if (reqBuffer.length > 2_000_000) {
    log({ level: 'warn', msg: 'payments_hooks_payload_too_large', requestId, bytes: reqBuffer.length });
    return res.status(413).send('Payload Too Large');
  }
  const signature = req.headers['stripe-signature'];
  let event = null;

  try {
    const stripe = await getStripe();
    const signingSecret =
      (await getSystemConfig('STRIPE_WEBHOOK_SECRET')) ||
      (await getSystemConfig('PAYMENTS_SIGNING_SECRET'));

    if (!signature || !signingSecret) {
      res.status(400).send('Missing signature or signing secret');
      return;
    }

    event = stripe.webhooks.constructEvent(
      reqBuffer,
      signature,
      signingSecret
    );
  } catch (err) {
    log({ level: 'warn', msg: 'payments_hooks_invalid_signature', requestId });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session?.metadata?.type) {
          const stripeCustomerId = session.customer;
          const type = session.metadata.type.toUpperCase();

          await prisma.customerPayment.updateMany({
            where: { paymentId: stripeCustomerId },
            data: {
              subscriptionType: type,
              providerSubscriptionId: session?.subscription ? String(session.subscription) : null,
              pendingSubscriptionType: null,
              pendingEffectiveAt: null,
              pendingStripePriceId: null,
            },
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;
        const status = subscription.status;
        const currentPeriodEnd = subscription?.current_period_end
          ? new Date(Number(subscription.current_period_end) * 1000)
          : null;

        if (shouldDowngradeFromStripeStatus(status)) {
          await prisma.customerPayment.updateMany({
            where: { paymentId: stripeCustomerId },
            data: {
              subscriptionType: 'FREE',
              providerSubscriptionId: subscription?.id ? String(subscription.id) : null,
              currentPeriodEnd,
              pendingSubscriptionType: null,
              pendingEffectiveAt: null,
              pendingStripePriceId: null,
            },
          });
          break;
        }

        if (status === 'active' || status === 'trialing') {
          const stripe = await getStripe();
          const type = await resolveSubscriptionTypeFromStripe(stripe, subscription);
          if (!type) break;

          await prisma.customerPayment.updateMany({
            where: { paymentId: stripeCustomerId },
            data: {
              subscriptionType: type,
              providerSubscriptionId: subscription?.id ? String(subscription.id) : null,
              currentPeriodEnd,
            },
          });

          await prisma.customerPayment.updateMany({
            where: { paymentId: stripeCustomerId, pendingSubscriptionType: type },
            data: { pendingSubscriptionType: null, pendingEffectiveAt: null, pendingStripePriceId: null },
          });
        }

        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const stripeCustomerId = invoice?.customer || null;
        const subscriptionId = invoice?.subscription || null;
        if (!stripeCustomerId || !subscriptionId) break;

        const stripe = await getStripe();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const status = subscription.status;

        if (shouldDowngradeFromStripeStatus(status)) {
          await prisma.customerPayment.updateMany({
            where: { paymentId: stripeCustomerId },
            data: {
              subscriptionType: 'FREE',
              providerSubscriptionId: null,
              currentPeriodEnd: null,
              pendingSubscriptionType: null,
              pendingEffectiveAt: null,
              pendingStripePriceId: null,
            },
          });
          break;
        }

        if (status === 'active' || status === 'trialing') {
          const type = await resolveSubscriptionTypeFromStripe(stripe, subscription);
          if (!type) break;
          await prisma.customerPayment.updateMany({
            where: { paymentId: stripeCustomerId },
            data: {
              subscriptionType: type,
              providerSubscriptionId: subscription?.id ? String(subscription.id) : null,
              currentPeriodEnd: subscription?.current_period_end
                ? new Date(Number(subscription.current_period_end) * 1000)
                : null,
            },
          });

          await prisma.customerPayment.updateMany({
            where: { paymentId: stripeCustomerId, pendingSubscriptionType: type },
            data: { pendingSubscriptionType: null, pendingEffectiveAt: null, pendingStripePriceId: null },
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const stripeCustomerId = invoice?.customer || null;
        if (!stripeCustomerId) break;
        const attemptCount = Number(invoice?.attempt_count || 0);
        if (attemptCount < 3) break;

        await prisma.customerPayment.updateMany({
          where: { paymentId: stripeCustomerId },
          data: {
            subscriptionType: 'FREE',
            providerSubscriptionId: null,
            currentPeriodEnd: null,
            pendingSubscriptionType: null,
            pendingEffectiveAt: null,
            pendingStripePriceId: null,
          },
        });
        break;
      }
      default:
        break;
    }
  } else {
    return res.status(400).send(`Webhook Error: Event not created`);
  }

  res.status(200).send({ received: true });
};

export default handler;
