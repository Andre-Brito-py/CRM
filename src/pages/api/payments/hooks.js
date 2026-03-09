import { buffer } from 'micro';

import getStripe from '@/lib/server/stripe';
import { getSystemConfig } from '@/lib/server/config';
import { updateSubscription } from '@/prisma/services/customer';
import prisma from '@/prisma/index';

export const config = { api: { bodyParser: false } };

const handler = async (req, res) => {
  const reqBuffer = await buffer(req);
  const signature = req.headers['stripe-signature'];
  let event = null;

  try {
    const stripe = await getStripe();
    const signingSecret = await getSystemConfig('PAYMENTS_SIGNING_SECRET', process.env.PAYMENTS_SIGNING_SECRET);
    event = stripe.webhooks.constructEvent(
      reqBuffer,
      signature,
      signingSecret
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event) {
    const { metadata } = event.data.object;

    switch (event.type) {
      case 'charge.succeeded':
        if (metadata?.customerId && metadata?.type) {
          await updateSubscription(metadata.customerId, metadata.type);
        }
        break;
      default:
        res
          .status(400)
          .send(`Webhook Error: Unhandled event type ${event.type}`);
    }
  } else {
    return res.status(400).send(`Webhook Error: Event not created`);
  }

  await prisma.$disconnect();
  res.status(200).send({ received: true });
};

export default handler;
