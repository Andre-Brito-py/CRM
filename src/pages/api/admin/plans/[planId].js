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
    const { name, slug, prices, features, description, isActive } = req.body;

    try {
      const existing = await prisma.plan.findUnique({
        where: { id: planId },
        include: { prices: true },
      });

      if (!existing) {
        res.status(404).json({ error: { msg: 'Plan not found' } });
        return;
      }

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

        let productId = null;
        const firstPriceId = existing.prices.find(p => p.stripePriceId)?.stripePriceId;
        if (firstPriceId) {
          const sp = await stripe.prices.retrieve(firstPriceId).catch(() => null);
          if (sp) productId = sp.product;
        }

        if (!productId) {
          const product = await stripe.products.create({
            name: String(name || 'Plano'),
            metadata: desiredType ? { type: desiredType } : undefined,
          });
          productId = product.id;
        } else {
          await stripe.products.update(productId, {
            name: String(name || 'Plano'),
            metadata: desiredType ? { type: desiredType } : undefined,
          }).catch(() => {});
        }

        for (const p of prices) {
          let fStripePriceId = p.stripePriceId || null;
          let fStripePriceIdAnnual = p.stripePriceIdAnnual || null;
          const pAmount = Number(p.price || p.amount || 0);
          const pAmountAnnual = (p.priceAnnual !== undefined) ? p.priceAnnual : p.amountAnnual;
          const pCurrency = normalizeCurrency(p.currency);

          const existingPrice = existing.prices.find(ep => ep.currency === pCurrency);
          const priceChanged = existingPrice ? (existingPrice.amount !== pAmount) : true;
          const annualPriceChanged = existingPrice ? (existingPrice.amountAnnual !== Number(pAmountAnnual || 0)) : true;

          if ((priceChanged || !fStripePriceId) && toCents(pAmount) > 0) {
            const created = await stripe.prices.create({
              unit_amount: toCents(pAmount),
              currency: pCurrency.toLowerCase(),
              recurring: { interval: 'month' },
              product: productId,
            });
            if (fStripePriceId) stripe.prices.update(fStripePriceId, { active: false }).catch(() => {});
            fStripePriceId = created.id;
          }

          if ((annualPriceChanged || !fStripePriceIdAnnual) && pAmountAnnual && toCents(pAmountAnnual) > 0) {
            const createdAnnual = await stripe.prices.create({
              unit_amount: toCents(pAmountAnnual),
              currency: pCurrency.toLowerCase(),
              recurring: { interval: 'year' },
              product: productId,
            });
            if (fStripePriceIdAnnual) stripe.prices.update(fStripePriceIdAnnual, { active: false }).catch(() => {});
            fStripePriceIdAnnual = createdAnnual.id;
          }

          finalPrices.push({
            currency: pCurrency,
            amount: pAmount,
            amountAnnual: pAmountAnnual ? Number(pAmountAnnual) : null,
            stripePriceId: fStripePriceId,
            stripePriceIdAnnual: fStripePriceIdAnnual,
          });
        }
      }

      const plan = await prisma.$transaction(async (tx) => {
        await tx.planPrice.deleteMany({ where: { planId } });

        return await tx.plan.update({
          where: { id: planId },
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
            isActive: typeof isActive === 'boolean' ? isActive : true,
            prices: {
              create: finalPrices,
            },
          },
          include: { prices: true },
        });
      });

      await createPlatformAuditActivity(
        session.user.userId || session.user.id,
        session.user.email,
        {
          action: 'PLAN_UPDATE',
          title: 'Plan updated (Multi-currency)',
          target: { planId },
          metadata: { slug: plan.slug, priceCount: finalPrices.length, isActive: plan.isActive },
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
