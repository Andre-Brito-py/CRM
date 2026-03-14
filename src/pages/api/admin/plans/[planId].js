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

  const { planId } = req.query;

  if (req.method === 'PUT') {
    const { name, slug, price, interval, currency, features, stripePriceId, description, isActive } = req.body;

    try {
      const existing = await prisma.plan.findUnique({
        where: { id: planId },
        select: { stripePriceId: true },
      });

      const desiredType = normalizePlanType(slug);
      const desiredPrice = Number(price || 0);
      const desiredCurrency = normalizeCurrency(currency);
      const desiredInterval = normalizeInterval(interval);

      let syncedPrice = desiredPrice;
      let syncedCurrency = desiredCurrency;
      let syncedInterval = desiredInterval;
      let finalStripePriceId = existing?.stripePriceId || null;

      const incomingStripePriceId = stripePriceId ? String(stripePriceId).trim() : null;
      const stripePriceIdChanged =
        incomingStripePriceId && incomingStripePriceId !== String(existing?.stripePriceId || '');

      if (stripePriceIdChanged) {
        let stripePrice = null;
        try {
          const stripe = await getStripe();
          stripePrice = await stripe.prices.retrieve(incomingStripePriceId);
        } catch (error) {
          res.status(400).json({ error: { msg: 'Unable to fetch Stripe price. Check Stripe keys and Price ID.' } });
          return;
        }

        if (!stripePrice?.recurring?.interval) {
          res.status(400).json({ error: { msg: 'Stripe Price ID must be recurring for subscriptions' } });
          return;
        }

        syncedPrice = Number(stripePrice.unit_amount || 0) / 100;
        syncedCurrency = normalizeCurrency(stripePrice.currency || desiredCurrency || 'USD');
        syncedInterval = stripePrice.recurring.interval;
        finalStripePriceId = incomingStripePriceId;
        if (desiredType && stripePrice?.product) {
          try {
            const stripe = await getStripe();
            await stripe.products.update(stripePrice.product, {
              name: String(name || 'Plano'),
              metadata: { type: desiredType },
            });
          } catch { }
        }
      } else if (finalStripePriceId) {
        let stripe = null;
        let currentPrice = null;
        try {
          stripe = await getStripe();
          currentPrice = await stripe.prices.retrieve(finalStripePriceId);
        } catch (error) {
          res.status(400).json({ error: { msg: 'Unable to fetch Stripe price. Check Stripe keys and Price ID.' } });
          return;
        }

        if (!currentPrice?.recurring?.interval) {
          res.status(400).json({ error: { msg: 'Stripe Price ID must be recurring for subscriptions' } });
          return;
        }

        const desiredUnitAmount = toCents(desiredPrice);
        const currentUnitAmount = typeof currentPrice.unit_amount === 'number' ? currentPrice.unit_amount : null;
        const currentCurrency = normalizeCurrency(currentPrice.currency);
        const currentInterval = normalizeInterval(currentPrice.recurring.interval);

        const shouldCreateNewPrice =
          desiredUnitAmount > 0 &&
          (currentUnitAmount === null ||
            currentUnitAmount !== desiredUnitAmount ||
            currentCurrency !== desiredCurrency ||
            currentInterval !== desiredInterval);

        if (shouldCreateNewPrice) {
          const created = await stripe.prices.create({
            unit_amount: desiredUnitAmount,
            currency: String(desiredCurrency).toLowerCase(),
            recurring: { interval: desiredInterval },
            product: currentPrice.product,
          });

          try {
            await stripe.prices.update(finalStripePriceId, { active: false });
          } catch { }

          finalStripePriceId = created.id;
          syncedPrice = desiredPrice;
          syncedCurrency = desiredCurrency;
          syncedInterval = desiredInterval;
          if (desiredType && currentPrice?.product) {
            try {
              await stripe.products.update(currentPrice.product, {
                name: String(name || 'Plano'),
                metadata: { type: desiredType },
              });
            } catch { }
          }
        } else {
          syncedPrice = Number(currentPrice.unit_amount || 0) / 100;
          syncedCurrency = normalizeCurrency(currentPrice.currency || desiredCurrency || 'USD');
          syncedInterval = currentPrice.recurring.interval;
          if (desiredType && currentPrice?.product) {
            try {
              await stripe.products.update(currentPrice.product, {
                name: String(name || 'Plano'),
                metadata: { type: desiredType },
              });
            } catch { }
          }
        }
      } else if (toCents(desiredPrice) > 0) {
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

        const product = await stripe.products.create({
          name: String(name || 'Plano'),
          metadata: { type: desiredType },
        });

        const created = await stripe.prices.create({
          unit_amount: toCents(desiredPrice),
          currency: String(desiredCurrency).toLowerCase(),
          recurring: { interval: desiredInterval },
          product: product.id,
        });

        finalStripePriceId = created.id;
        syncedPrice = desiredPrice;
        syncedCurrency = desiredCurrency;
        syncedInterval = desiredInterval;
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
          stripePriceId: finalStripePriceId,
          description,
          isActive,
        },
      });

      await createPlatformAuditActivity(
        session.user.userId || session.user.id,
        session.user.email,
        {
          action: 'PLAN_UPDATE',
          title: 'Plan updated',
          target: { planId },
          metadata: { slug: plan.slug, interval: plan.interval, price: plan.price, currency: plan.currency, isActive: plan.isActive },
        },
        req
      );

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

      await createPlatformAuditActivity(
        session.user.userId || session.user.id,
        session.user.email,
        { action: 'PLAN_DELETE', title: 'Plan deleted', target: { planId } },
        req
      );

      res.status(200).json({ data: { msg: 'Plan deleted successfully' } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to delete plan' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
