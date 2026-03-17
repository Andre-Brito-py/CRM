import prisma from '@/prisma/index';
import getStripe from '@/lib/server/stripe';
import { createPlatformAuditActivity } from '@/prisma/services/activity';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

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
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const { planId } = req.query;

  if (req.method === 'PUT') {
    const { name, slug, price, priceAnnual, annualDiscount, currency, features, stripePriceId, stripePriceIdAnnual, description, isActive } = req.body;

    try {
      const existing = await prisma.plan.findUnique({
        where: { id: planId },
        select: { stripePriceId: true, stripePriceIdAnnual: true },
      });

      const desiredType = normalizePlanType(slug);
      const desiredPrice = Number(price || 0);
      const desiredPriceAnnual = priceAnnual != null ? Number(priceAnnual) : null;
      const desiredDiscount = annualDiscount != null ? Number(annualDiscount) : null;
      const desiredCurrency = normalizeCurrency(currency);
      const desiredInterval = 'month';

      let syncedPrice = desiredPrice;
      let syncedPriceAnnual = desiredPriceAnnual;
      let syncedDiscount = desiredDiscount;
      let syncedCurrency = desiredCurrency;
      let syncedInterval = desiredInterval;
      let finalStripePriceId = existing?.stripePriceId || null;
      let finalStripePriceIdAnnual = existing?.stripePriceIdAnnual || null;

      const incomingStripePriceId = stripePriceId ? String(stripePriceId).trim() : null;
      const stripePriceIdChanged = incomingStripePriceId && incomingStripePriceId !== String(existing?.stripePriceId || '');
      const incomingStripePriceIdAnnual = stripePriceIdAnnual ? String(stripePriceIdAnnual).trim() : null;
      const stripePriceIdAnnualChanged = incomingStripePriceIdAnnual && incomingStripePriceIdAnnual !== String(existing?.stripePriceIdAnnual || '');

      let productId = null;
      const stripe = await getStripe().catch(() => null);

      if (stripe) {
        if (stripePriceIdChanged) {
          const stripePrice = await stripe.prices.retrieve(incomingStripePriceId).catch(() => null);
          if (stripePrice) {
            syncedPrice = Number(stripePrice.unit_amount || 0) / 100;
            syncedCurrency = normalizeCurrency(stripePrice.currency || desiredCurrency || 'USD');
            syncedInterval = stripePrice.recurring?.interval || 'month';
            finalStripePriceId = incomingStripePriceId;
            productId = stripePrice.product;
          }
        } else if (finalStripePriceId) {
          const currentPrice = await stripe.prices.retrieve(finalStripePriceId).catch(() => null);
          if (currentPrice) {
            productId = currentPrice.product;
            const desiredUnitAmount = toCents(desiredPrice);
            if (desiredUnitAmount > 0 && currentPrice.unit_amount !== desiredUnitAmount) {
              const created = await stripe.prices.create({
                unit_amount: desiredUnitAmount,
                currency: String(desiredCurrency).toLowerCase(),
                recurring: { interval: 'month' },
                product: currentPrice.product,
              });
              stripe.prices.update(finalStripePriceId, { active: false }).catch(() => { });
              finalStripePriceId = created.id;
              syncedPrice = desiredPrice;
            } else {
              syncedPrice = Number(currentPrice.unit_amount || 0) / 100;
              syncedCurrency = normalizeCurrency(currentPrice.currency || desiredCurrency || 'USD');
              syncedInterval = 'month';
            }
          }
        }

        if (stripePriceIdAnnualChanged) {
          const stripePriceA = await stripe.prices.retrieve(incomingStripePriceIdAnnual).catch(() => null);
          if (stripePriceA) {
            syncedPriceAnnual = Number(stripePriceA.unit_amount || 0) / 100;
            finalStripePriceIdAnnual = incomingStripePriceIdAnnual;
            if (!productId) productId = stripePriceA.product;
          }
        } else if (finalStripePriceIdAnnual && syncedPriceAnnual != null && syncedPriceAnnual > 0) {
          const currentPriceA = await stripe.prices.retrieve(finalStripePriceIdAnnual).catch(() => null);
          if (currentPriceA) {
            if (!productId) productId = currentPriceA.product;
            const desiredUnitAmountA = toCents(desiredPriceAnnual);
            if (currentPriceA.unit_amount !== desiredUnitAmountA) {
              const createdA = await stripe.prices.create({
                unit_amount: desiredUnitAmountA,
                currency: String(desiredCurrency).toLowerCase(),
                recurring: { interval: 'year' },
                product: currentPriceA.product,
              });
              stripe.prices.update(finalStripePriceIdAnnual, { active: false }).catch(() => { });
              finalStripePriceIdAnnual = createdA.id;
              syncedPriceAnnual = desiredPriceAnnual;
            } else {
              syncedPriceAnnual = Number(currentPriceA.unit_amount || 0) / 100;
            }
          }
        }

        // Se ainda não temos productId e precisamos criar preços
        if (!productId && (toCents(desiredPrice) > 0 || (syncedPriceAnnual && toCents(syncedPriceAnnual) > 0))) {
          const product = await stripe.products.create({
            name: String(name || 'Plano'),
            metadata: desiredType ? { type: desiredType } : undefined,
          });
          productId = product.id;

          if (toCents(desiredPrice) > 0) {
            const created = await stripe.prices.create({
              unit_amount: toCents(desiredPrice),
              currency: String(desiredCurrency).toLowerCase(),
              recurring: { interval: 'month' },
              product: productId,
            });
            finalStripePriceId = created.id;
            syncedPrice = desiredPrice;
          }

          if (syncedPriceAnnual && toCents(syncedPriceAnnual) > 0) {
            const createdAnnual = await stripe.prices.create({
              unit_amount: toCents(syncedPriceAnnual),
              currency: String(desiredCurrency).toLowerCase(),
              recurring: { interval: 'year' },
              product: productId,
            });
            finalStripePriceIdAnnual = createdAnnual.id;
          }
        } else if (productId && !finalStripePriceIdAnnual && syncedPriceAnnual && toCents(syncedPriceAnnual) > 0) {
          // Add annual price to existing product if it didn't exist
          const createdAnnual = await stripe.prices.create({
            unit_amount: toCents(syncedPriceAnnual),
            currency: String(desiredCurrency).toLowerCase(),
            recurring: { interval: 'year' },
            product: productId,
          });
          finalStripePriceIdAnnual = createdAnnual.id;
        }

        if (desiredType && productId) {
          stripe.products.update(productId, {
            name: String(name || 'Plano'),
            metadata: { type: desiredType },
          }).catch(() => { });
        }
      }

      const plan = await prisma.plan.update({
        where: { id: planId },
        data: {
          name,
          slug,
          price: syncedPrice,
          priceAnnual: syncedPriceAnnual,
          annualDiscount: syncedDiscount,
          interval: syncedInterval,
          currency: syncedCurrency,
          features,
          stripePriceId: finalStripePriceId,
          stripePriceIdAnnual: finalStripePriceIdAnnual,
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
          metadata: { slug: plan.slug, interval: plan.interval, price: plan.price, priceAnnual: plan.priceAnnual, annualDiscount: plan.annualDiscount, currency: plan.currency, isActive: plan.isActive },
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
