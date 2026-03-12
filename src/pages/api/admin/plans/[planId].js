import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';
import getStripe from '@/lib/server/stripe';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  // Double check role from DB for security
  const user = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { role: true },
  });

  if (!user || user.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  const { planId } = req.query;

  if (req.method === 'PUT') {
    const { name, slug, price, interval, currency, features, stripePriceId, description, isActive } = req.body;

    try {
      let syncedPrice = price;
      let syncedCurrency = currency;
      let syncedInterval = interval;

      if (stripePriceId) {
        let stripePrice = null;
        try {
          const stripe = await getStripe();
          stripePrice = await stripe.prices.retrieve(stripePriceId);
        } catch (error) {
          res.status(400).json({ error: { msg: 'Unable to fetch Stripe price. Check Stripe keys and Price ID.' } });
          return;
        }

        if (!stripePrice?.recurring?.interval) {
          res.status(400).json({ error: { msg: 'Stripe Price ID must be recurring for subscriptions' } });
          return;
        }

        syncedPrice = Number(stripePrice.unit_amount || 0) / 100;
        syncedCurrency = (stripePrice.currency || currency || 'USD').toUpperCase();
        syncedInterval = stripePrice.recurring.interval;
      }

      const plan = await prisma.plan.update({
        where: { id: planId },
        data: {
          name,
          slug,
          price: syncedPrice,
          interval: syncedInterval,
          currency: syncedCurrency,
          features,
          stripePriceId,
          description,
          isActive,
        },
      });

      res.status(200).json({ data: { plan } });
    } catch (error) {
      console.error(error);
      if (error.code === 'P2002') {
        res.status(400).json({ error: { msg: 'Plan slug already exists' } });
      } else {
        res.status(500).json({ error: { msg: 'Failed to update plan' } });
      }
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.plan.delete({
        where: { id: planId },
      });

      res.status(200).json({ data: { msg: 'Plan deleted successfully' } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to delete plan' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
