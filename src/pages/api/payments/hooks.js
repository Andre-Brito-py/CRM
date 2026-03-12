import { buffer } from 'micro';

import getStripe from '@/lib/server/stripe';
import { getSystemConfig } from '@/lib/server/config';
import prisma from '@/prisma/index';

export const config = { api: { bodyParser: false } };

const handler = async (req, res) => {
  const reqBuffer = await buffer(req);
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
            data: { subscriptionType: type },
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;
        const status = subscription.status;

        if (status === 'canceled' || status === 'unpaid') {
          await prisma.customerPayment.updateMany({
            where: { paymentId: stripeCustomerId },
            data: { subscriptionType: 'FREE' },
          });
          break;
        }

        if (status === 'active' || status === 'trialing') {
          const stripe = await getStripe();
          const priceId = subscription.items.data[0].price.id;
          const price = await stripe.prices.retrieve(priceId);
          const product = await stripe.products.retrieve(price.product);
          const type = product.metadata?.type?.toUpperCase() || 'STANDARD';

          await prisma.customerPayment.updateMany({
            where: { paymentId: stripeCustomerId },
            data: { subscriptionType: type },
          });
        }

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
