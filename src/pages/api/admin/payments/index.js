import { getSession } from 'next-auth/react';
import getStripe from '@/lib/server/stripe';
import prisma from '@/prisma/index';
import { createPlatformAuditActivity } from '@/prisma/services/activity';

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

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { role: true },
  });

  if (!user || user.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  if (req.method === 'GET') {
    try {
      const payments = await prisma.customerPayment.findMany({
        select: {
          id: true,
          paymentId: true,
          subscriptionType: true,
          createdAt: true,
          customer: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({ data: { payments } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to fetch payments' } });
    }
  } else if (req.method === 'POST') {
    try {
      const { customerPaymentId, email, paymentId } = req.body || {};
      const target = customerPaymentId
        ? await prisma.customerPayment.findUnique({ where: { id: customerPaymentId } })
        : email
          ? await prisma.customerPayment.findUnique({ where: { email } })
          : paymentId
            ? await prisma.customerPayment.findFirst({ where: { paymentId } })
            : null;

      if (!target) {
        return res.status(404).json({ error: { msg: 'Payment account not found' } });
      }

      if (!target.paymentId) {
        return res.status(400).json({ error: { msg: 'Stripe customer id missing' } });
      }

      const stripe = await getStripe();
      const subscriptions = await stripe.subscriptions.list({
        customer: target.paymentId,
        status: 'all',
        limit: 10,
      });

      const items = Array.isArray(subscriptions?.data) ? subscriptions.data : [];
      const best =
        items.find((s) => s.status === 'active' || s.status === 'trialing') ||
        items.sort((a, b) => (b.created || 0) - (a.created || 0))[0] ||
        null;

      let subscriptionType = 'FREE';
      if (best) {
        if (shouldDowngradeFromStripeStatus(best.status)) {
          subscriptionType = 'FREE';
        } else if (best.status === 'active' || best.status === 'trialing') {
          const type = await resolveSubscriptionTypeFromStripe(stripe, best);
          subscriptionType = type || 'STANDARD';
        } else {
          subscriptionType = target.subscriptionType || 'FREE';
        }
      }

      const updated = await prisma.customerPayment.update({
        where: { id: target.id },
        data: { subscriptionType },
      });

      await createPlatformAuditActivity(
        session.user.userId || session.user.id,
        session.user.email,
        {
          action: 'PAYMENT_RECONCILE',
          title: 'Payment account reconciled',
          target: { customerPaymentId: updated.id },
          metadata: { subscriptionType: updated.subscriptionType, paymentId: updated.paymentId || null, email: updated.email || null },
        },
        req
      );

      return res.status(200).json({ data: { payment: updated } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: { msg: 'Failed to reconcile payment account' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
