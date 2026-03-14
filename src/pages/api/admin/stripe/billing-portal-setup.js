import { validateSession } from '@/config/api-validation';
import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';
import getStripe from '@/lib/server/stripe';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const { method } = req;

  if (method !== 'POST') {
    res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
    return;
  }

  try {
    const session = await validateSession(req, res);
    if (!session || session.user?.role !== 'SUPERADMIN') {
      res.status(403).json({ errors: { error: { msg: 'Forbidden' } } });
      return;
    }

    const stripe = await getStripe();
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { slug: true, stripePriceId: true },
    });

    const uniquePriceIds = Array.from(
      new Set(
        (Array.isArray(plans) ? plans : [])
          .map((p) => (p?.stripePriceId ? String(p.stripePriceId) : null))
          .filter(Boolean)
          .filter((id) => !String(id).includes('PLACEHOLDER'))
      )
    );

    const priceObjects = [];
    for (const priceId of uniquePriceIds) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        if (price?.active && price?.recurring && price?.product) priceObjects.push(price);
      } catch (error) {
        log({ level: 'warn', msg: 'stripe_portal_setup_price_retrieve_failed', requestId, priceId, error });
      }
    }

    const productsById = new Map();
    for (const price of priceObjects) {
      const productId = price?.product ? String(price.product) : null;
      if (!productId) continue;
      if (!productsById.has(productId)) productsById.set(productId, new Set());
      productsById.get(productId).add(price.id);
    }

    const products = Array.from(productsById.entries()).map(([product, priceSet]) => ({
      product,
      prices: Array.from(priceSet.values()),
    }));

    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Gerencie seu plano e cobranças',
      },
      features: {
        payment_method_update: { enabled: true },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: { enabled: true, options: ['too_expensive', 'missing_features', 'unused', 'other'] },
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          proration_behavior: 'create_prorations',
          products: products.length > 0 ? products : undefined,
        },
        invoice_history: { enabled: true },
      },
    });

    await prisma.systemConfig.upsert({
      where: { key: 'STRIPE_BILLING_PORTAL_CONFIGURATION_ID' },
      update: { value: configuration.id, category: 'PAYMENT' },
      create: { key: 'STRIPE_BILLING_PORTAL_CONFIGURATION_ID', value: configuration.id, category: 'PAYMENT' },
    });

    const appUrl = await getSystemConfig('APP_URL', process.env.APP_URL);
    res.status(200).json({
      data: {
        configurationId: configuration.id,
        livemode: configuration?.livemode === true,
        dashboardUrl: configuration?.id
          ? `https://dashboard.stripe.com${configuration?.livemode ? '' : '/test'}/billing/portal/configurations/${configuration.id}`
          : null,
        returnUrl: appUrl ? `${String(appUrl).replace(/\/$/, '')}/account/billing` : null,
      },
    });
  } catch (error) {
    log({ level: 'error', msg: 'stripe_portal_setup_failed', requestId, error });
    reportError(error, { route: '/api/admin/stripe/billing-portal-setup', requestId });
    res.status(500).json({ errors: { error: { msg: 'Unable to setup billing portal' } } });
  }
};

export default handler;
