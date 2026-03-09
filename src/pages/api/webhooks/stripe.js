import { buffer } from 'micro';
import getStripe from '@/lib/server/stripe';
import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req, res) => {
  if (req.method === 'POST') {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    const webhookSecret = await getSystemConfig('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET);

    let event;

    try {
      if (!sig || !webhookSecret) return res.status(400).send('Missing signature or secret');
      const stripe = await getStripe();
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          if (session.mode === 'subscription') {
            await handleSubscriptionCreated(session);
          }
          break;
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object;
          await handleSubscriptionUpdated(subscription);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error handling webhook event', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
};

async function handleSubscriptionCreated(session) {
  const customerId = session.customer;
  const metadata = session.metadata;

  if (metadata?.type) {
    const type = metadata.type.toUpperCase();
    await prisma.customerPayment.updateMany({
      where: { paymentId: customerId },
      data: { subscriptionType: type },
    });
    console.log(`✅ Subscription created: updated customer ${customerId} to ${type}`);
  }
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  const status = subscription.status;

  if (status === 'canceled' || status === 'unpaid') {
    await prisma.customerPayment.updateMany({
      where: { paymentId: customerId },
      data: { subscriptionType: 'FREE' },
    });
    console.log(`❌ Subscription canceled/unpaid: Customer ${customerId} downgraded to FREE`);
  } else if (status === 'active' || status === 'trialing') {
    const stripe = await getStripe();
    // Busca o plano no Stripe para ver que tipo é
    const priceId = subscription.items.data[0].price.id;
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product);

    const type = product.metadata?.type?.toUpperCase() || 'STANDARD';

    await prisma.customerPayment.updateMany({
      where: { paymentId: customerId },
      data: { subscriptionType: type },
    });
    console.log(`🔄 Subscription updated: Customer ${customerId} updated to ${type}`);
  }
}

export default handler;
