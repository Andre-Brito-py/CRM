import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';
import getStripe from '@/lib/server/stripe';
import { createPlatformAuditActivity } from '@/prisma/services/activity';

const normalizeInterval = (value) => {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'year' || v === 'annual' || v === 'yearly') return 'year';
  return 'month';
};

const normalizeCurrency = (value) => String(value || 'USD').trim().toUpperCase();

const toCents = (value) => Math.max(0, Math.round(Number(value || 0) * 100));

const normalizePlanType = (value) => {
  const t = String(value || '').trim().toUpperCase();
  if (t === 'FREE' || t === 'STANDARD' || t === 'PREMIUM') return t;
  return null;
};

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
      const desiredType = normalizePlanType(slug);
      let syncedPrice = Number(price || 0);
      let syncedCurrency = normalizeCurrency(currency);
      let syncedInterval = normalizeInterval(interval);
      let finalStripePriceId = stripePriceId || null;

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
        syncedCurrency = normalizeCurrency(stripePrice.currency || currency || 'USD');
        syncedInterval = stripePrice.recurring.interval;
        finalStripePriceId = stripePriceId;
        if (desiredType && stripePrice?.product) {
          try {
            const stripe = await getStripe();
            await stripe.products.update(stripePrice.product, {
              name: String(name || 'Plano'),
              metadata: { type: desiredType },
            });
          } catch { }
        }
      } else if (toCents(syncedPrice) > 0) {
        if (!desiredType) {
          res.status(400).json({ error: { msg: 'Slug inválido. Use FREE, STANDARD ou PREMIUM.' } });
          return;
        }

        let stripe = null;
        try {
          stripe = await getStripe();
        } catch (error) {
          res.status(400).json({ error: { msg: 'Stripe não configurado para criar preço automaticamente' } });
          return;
        }

        const type = String(slug || '').trim().toUpperCase();
        const product = await stripe.products.create({
          name: String(name || 'Plano'),
          metadata: { type: desiredType },
        });

        const created = await stripe.prices.create({
          unit_amount: toCents(syncedPrice),
          currency: String(syncedCurrency).toLowerCase(),
          recurring: { interval: syncedInterval },
          product: product.id,
        });

        finalStripePriceId = created.id;
      }

      const plan = await prisma.plan.create({
        data: {
          name,
          slug,
          price: syncedPrice,
          interval: syncedInterval,
          currency: syncedCurrency,
          features,
          stripePriceId: finalStripePriceId,
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
