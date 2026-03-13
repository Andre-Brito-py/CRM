import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';
import getStripe from '@/lib/server/stripe';
import { createPlatformAuditActivity } from '@/prisma/services/activity';

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

  if (req.method === 'GET') {
    try {
      const plans = await prisma.plan.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({ data: { plans } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to fetch plans' } });
    }
  } else if (req.method === 'POST') {
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

      const plan = await prisma.plan.create({
        data: {
          name,
          slug,
          price: syncedPrice,
          interval: syncedInterval,
          currency: syncedCurrency,
          features,
          stripePriceId,
          description,
          isActive: typeof isActive === 'boolean' ? isActive : true,
        },
      });

      await createPlatformAuditActivity(
        session.user.userId || session.user.id,
        session.user.email,
        {
          action: 'PLAN_CREATE',
          title: 'Plan created',
          target: { planId: plan.id },
          metadata: { slug: plan.slug, interval: plan.interval, price: plan.price, currency: plan.currency, isActive: plan.isActive },
        },
        req
      );

      res.status(201).json({ data: { plan } });
    } catch (error) {
      console.error(error);
      if (error.code === 'P2002') {
        res.status(400).json({ error: { msg: 'Plan slug already exists' } });
      } else {
        res.status(500).json({ error: { msg: 'Failed to create plan' } });
      }
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
