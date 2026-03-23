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

  if (req.method === 'GET') {
    try {
      const plans = await prisma.plan.findMany({
        include: {
          prices: {
            orderBy: { createdAt: 'asc' }
          }
        },
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
    const { name, slug, prices, features, description, isActive, cancellationFeePercentage } = req.body;

    try {
      const isFreePlan = Boolean(features?.isFreePlan);
      const desiredType = normalizePlanType(slug);
      const finalPrices = [];

      if (isFreePlan) {
        // Free plan has no prices in Stripe
      } else if (Array.isArray(prices) && prices.length > 0) {
        let stripe = null;
        try {
          stripe = await getStripe();
        } catch (error) {
          res.status(400).json({ error: { msg: 'Stripe não configurado' } });
          return;
        }

        const product = await stripe.products.create({
          name: String(name || 'Plano'),
          metadata: desiredType ? { type: desiredType } : undefined,
        });

        for (const p of prices) {
          let fStripePriceId = p.stripePriceId || null;
          let fStripePriceIdAnnual = p.stripePriceIdAnnual || null;
          const pAmount = Number(p.price || 0);
          const pAmountAnnual = p.priceAnnual ? Number(p.priceAnnual) : null;
          const pCurrency = normalizeCurrency(p.currency);

          if (!fStripePriceId && toCents(pAmount) > 0) {
            const created = await stripe.prices.create({
              unit_amount: toCents(pAmount),
              currency: pCurrency.toLowerCase(),
              recurring: { interval: 'month' },
              product: product.id,
            });
            fStripePriceId = created.id;
          }

          if (!fStripePriceIdAnnual && pAmountAnnual && toCents(pAmountAnnual) > 0) {
            const createdAnnual = await stripe.prices.create({
              unit_amount: toCents(pAmountAnnual),
              currency: pCurrency.toLowerCase(),
              recurring: { interval: 'year' },
              product: product.id,
            });
            fStripePriceIdAnnual = createdAnnual.id;
          }

          finalPrices.push({
            currency: pCurrency,
            amount: pAmount,
            amountAnnual: pAmountAnnual,
            stripePriceId: fStripePriceId,
            stripePriceIdAnnual: fStripePriceIdAnnual,
          });
        }
      }

      const plan = await prisma.plan.create({
        data: {
          name,
          slug,
          price: finalPrices[0]?.amount || 0,
          priceAnnual: finalPrices[0]?.amountAnnual || null,
          currency: finalPrices[0]?.currency || 'USD',
          stripePriceId: finalPrices[0]?.stripePriceId || null,
          stripePriceIdAnnual: finalPrices[0]?.stripePriceIdAnnual || null,
          features,
          description,
          cancellationFeePercentage: parseFloat(cancellationFeePercentage || 0),
          isActive: typeof isActive === 'boolean' ? isActive : true,
          prices: {
            create: finalPrices,
          },
        },
        include: { prices: true },
      });

      await createPlatformAuditActivity(
        session.user.userId || session.user.id,
        session.user.email,
        {
          action: 'PLAN_CREATE',
          title: 'Plan created',
          target: { planId: plan.id },
          metadata: { slug: plan.slug, interval: plan.interval, price: plan.price, priceAnnual: plan.priceAnnual, annualDiscount: plan.annualDiscount, currency: plan.currency, isActive: plan.isActive },
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
