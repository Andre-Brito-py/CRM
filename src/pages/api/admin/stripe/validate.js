import { validateSession } from '@/config/api-validation';
import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';
import getStripe from '@/lib/server/stripe';
import prisma from '@/prisma/index';

const isTruthy = (value) => {
  const v = String(value || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
};

const handler = async (req, res) => {
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const { method } = req;

  try {
    const session = await validateSession(req, res);
    if (!session || session.user?.role !== 'SUPERADMIN') {
      res.status(403).json({ errors: { error: { msg: 'Forbidden' } } });
      return;
    }

    const [appUrl, secretKey, publishableKey, webhookSecret] = await Promise.all([
      getSystemConfig('APP_URL', process.env.APP_URL),
      getSystemConfig('PAYMENTS_SECRET_KEY', process.env.PAYMENTS_SECRET_KEY),
      getSystemConfig('STRIPE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_PUBLISHABLE_KEY),
      getSystemConfig('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET),
    ]);

    if (method === 'POST') {
      const stripe = await getStripe();

      const eventId = String(req.body?.eventId || '').trim();
      const timesRaw = req.body?.times;
      const times = Math.max(2, Math.min(3, Number(timesRaw || 2)));

      if (!eventId || !eventId.startsWith('evt_')) {
        res.status(400).json({ errors: { error: { msg: 'eventId inválido' } } });
        return;
      }
      if (!appUrl) {
        res.status(400).json({ errors: { error: { msg: 'APP_URL ausente' } } });
        return;
      }
      if (!webhookSecret) {
        res.status(400).json({ errors: { error: { msg: 'STRIPE_WEBHOOK_SECRET ausente' } } });
        return;
      }

      let stripeEvent;
      try {
        stripeEvent = await stripe.events.retrieve(eventId);
      } catch (error) {
        log({ level: 'warn', msg: 'stripe_validate_replay_retrieve_failed', requestId, eventId, error });
        res.status(400).json({ errors: { error: { msg: 'Não foi possível buscar o evento no Stripe' } } });
        return;
      }

      const eventType = stripeEvent?.type ? String(stripeEvent.type) : null;
      const livemode = Boolean(stripeEvent?.livemode);

      const dataObject = stripeEvent?.data?.object || null;
      const stripeCustomerId = dataObject?.customer ? String(dataObject.customer) : null;
      const stripeInvoiceId = dataObject?.object === 'invoice' && dataObject?.id ? String(dataObject.id) : null;

      const snapshot = async () => {
        const [row, payment, fiscal] = await Promise.all([
          prisma.stripeEvent.findUnique({
            where: { id: eventId },
            select: {
              id: true,
              type: true,
              livemode: true,
              status: true,
              receivedAt: true,
              processedAt: true,
              error: true,
            },
          }),
          stripeCustomerId
            ? prisma.customerPayment.findFirst({
              where: { paymentId: stripeCustomerId },
              select: {
                id: true,
                subscriptionType: true,
                providerSubscriptionId: true,
                currentPeriodEnd: true,
                pendingSubscriptionType: true,
                pendingEffectiveAt: true,
                pendingStripePriceId: true,
              },
            })
            : Promise.resolve(null),
          stripeInvoiceId
            ? prisma.fiscalDocument.findMany({
              where: { stripeInvoiceId },
              select: { id: true, status: true, createdAt: true, error: true },
              orderBy: { createdAt: 'desc' },
              take: 5,
            })
            : Promise.resolve([]),
        ]);

        return {
          stripeEvent: row,
          customerPayment: payment,
          fiscalDocuments: fiscal,
        };
      };

      const before = await snapshot();
      const webhookUrl = `${String(appUrl).replace(/\/$/, '')}/api/webhooks/stripe`;

      const payload = JSON.stringify(stripeEvent);
      const generator = stripe?.webhooks?.generateTestHeaderString;
      if (typeof generator !== 'function') {
        res.status(500).json({ errors: { error: { msg: 'Stripe SDK sem generateTestHeaderString' } } });
        return;
      }

      const attempts = [];
      const after = [];

      for (let i = 0; i < times; i += 1) {
        const signature = generator({
          payload,
          secret: webhookSecret,
          timestamp: Math.floor(Date.now() / 1000),
        });

        let status = null;
        let bodyText = null;
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'stripe-signature': signature,
              'Content-Type': 'application/json',
              'x-request-id': `replay:${eventId}:${i + 1}`,
            },
            body: payload,
          });
          status = response.status;
          bodyText = await response.text();
        } catch (error) {
          log({ level: 'warn', msg: 'stripe_validate_replay_fetch_failed', requestId, eventId, error });
          res.status(500).json({ errors: { error: { msg: 'Falha ao reenviar para o webhook' } } });
          return;
        }

        attempts.push({ index: i + 1, status, body: bodyText });
        after.push(await snapshot());
      }

      const last = after[after.length - 1] || null;
      const firstAfter = after[0] || null;

      const duplicatesDetected =
        (stripeInvoiceId
          ? (firstAfter?.fiscalDocuments?.length || 0) !== (last?.fiscalDocuments?.length || 0)
          : false) ||
        JSON.stringify(firstAfter?.customerPayment || null) !== JSON.stringify(last?.customerPayment || null) ||
        JSON.stringify(firstAfter?.stripeEvent || null) !== JSON.stringify(last?.stripeEvent || null);

      res.status(200).json({
        data: {
          replay: {
            event: { id: eventId, type: eventType, livemode, stripeCustomerId, stripeInvoiceId },
            webhookUrl,
            attempts,
            before,
            after,
            duplicatesDetected,
          },
        },
      });
      return;
    }

    if (method !== 'GET') {
      res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
      return;
    }

    const automaticTax = await getSystemConfig('STRIPE_AUTOMATIC_TAX', process.env.STRIPE_AUTOMATIC_TAX);
    const taxIdCollection = await getSystemConfig('STRIPE_TAX_ID_COLLECTION', process.env.STRIPE_TAX_ID_COLLECTION);
    const billingAddressCollection = await getSystemConfig(
      'STRIPE_BILLING_ADDRESS_COLLECTION',
      process.env.STRIPE_BILLING_ADDRESS_COLLECTION
    );
    const billingPortalConfigurationId = await getSystemConfig(
      'STRIPE_BILLING_PORTAL_CONFIGURATION_ID',
      process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID
    );

    const configs = {
      APP_URL: appUrl || null,
      PAYMENTS_SECRET_KEY: secretKey ? 'set' : null,
      STRIPE_PUBLISHABLE_KEY: publishableKey ? 'set' : null,
      STRIPE_WEBHOOK_SECRET: webhookSecret ? 'set' : null,
      STRIPE_AUTOMATIC_TAX: isTruthy(automaticTax),
      STRIPE_TAX_ID_COLLECTION: isTruthy(taxIdCollection),
      STRIPE_BILLING_ADDRESS_COLLECTION: billingAddressCollection || null,
      STRIPE_BILLING_PORTAL_CONFIGURATION_ID: billingPortalConfigurationId ? 'set' : null,
    };

    const mode = {
      secretKeyPrefix: secretKey ? String(secretKey).slice(0, 7) : null,
      publishableKeyPrefix: publishableKey ? String(publishableKey).slice(0, 7) : null,
      isLiveKey: secretKey ? String(secretKey).startsWith('sk_live_') : false,
    };

    const stripe = await getStripe();
    const balance = await stripe.balance.retrieve();
    const expectedWebhookUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/api/webhooks/stripe` : null;
    const requiredWebhookEvents = [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
    ];

    let billingPortalConfigurationOk = false;
    if (billingPortalConfigurationId) {
      try {
        const config = await stripe.billingPortal.configurations.retrieve(billingPortalConfigurationId);
        billingPortalConfigurationOk = Boolean(config?.id);
      } catch {
        billingPortalConfigurationOk = false;
      }
    }

    let webhookSecretOk = false;
    if (webhookSecret) {
      try {
        const payload = JSON.stringify({
          id: 'evt_validate_terms',
          object: 'event',
          type: 'invoice.paid',
          data: { object: { id: 'in_validate', object: 'invoice' } },
        });

        const generator = stripe?.webhooks?.generateTestHeaderString;
        if (typeof generator === 'function') {
          const signature = generator({
            payload,
            secret: webhookSecret,
            timestamp: Math.floor(Date.now() / 1000),
          });
          stripe.webhooks.constructEvent(payload, signature, webhookSecret);
          webhookSecretOk = true;
        }
      } catch {
        webhookSecretOk = false;
      }
    }

    let webhookEndpointOk = false;
    let webhookEndpointMatch = null;
    let webhookEndpointIssues = [];
    if (expectedWebhookUrl) {
      try {
        const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
        webhookEndpointMatch = endpoints?.data?.find((e) => e?.url === expectedWebhookUrl) || null;
        if (!webhookEndpointMatch) {
          webhookEndpointIssues.push('webhook_endpoint_missing');
        } else {
          const enabled = String(webhookEndpointMatch.status || '').toLowerCase() === 'enabled';
          if (!enabled) webhookEndpointIssues.push('webhook_endpoint_disabled');

          const enabledEvents = Array.isArray(webhookEndpointMatch.enabled_events) ? webhookEndpointMatch.enabled_events : [];
          const hasAll =
            enabledEvents.includes('*') ||
            requiredWebhookEvents.every((ev) => enabledEvents.includes(ev));
          if (!hasAll) {
            const missing = requiredWebhookEvents.filter((ev) => !enabledEvents.includes(ev));
            webhookEndpointIssues.push(`webhook_events_missing:${missing.join(',')}`);
          }

          webhookEndpointOk = enabled && hasAll;
        }
      } catch (error) {
        webhookEndpointIssues.push('webhook_endpoint_list_failed');
        log({ level: 'warn', msg: 'stripe_validate_webhook_endpoints_failed', requestId, error });
      }
    }

    const warnings = [];
    let liveWebhookEvents = null;
    if (mode.isLiveKey) {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last24hCount = await prisma.stripeEvent.count({
          where: { livemode: true, receivedAt: { gte: since } },
        });
        const recent = await prisma.stripeEvent.findMany({
          where: { livemode: true },
          orderBy: { receivedAt: 'desc' },
          take: 10,
          select: { id: true, type: true, receivedAt: true, status: true },
        });
        const grouped = await prisma.stripeEvent.groupBy({
          by: ['type'],
          where: { livemode: true, receivedAt: { gte: since } },
          _count: { _all: true },
        });
        const typesLast24h = grouped.reduce((acc, item) => {
          acc[item.type] = item._count?._all || 0;
          return acc;
        }, {});

        const groupedByStatus = await prisma.stripeEvent.groupBy({
          by: ['status'],
          where: { livemode: true, receivedAt: { gte: since } },
          _count: { _all: true },
        });
        const statusLast24h = groupedByStatus.reduce((acc, item) => {
          acc[item.status] = item._count?._all || 0;
          return acc;
        }, {});

        const missingRequired = requiredWebhookEvents.filter((ev) => (typesLast24h[ev] || 0) === 0);

        const staleSince = new Date(Date.now() - 10 * 60 * 1000);
        const staleProcessingCount = await prisma.stripeEvent.count({
          where: { livemode: true, status: 'processing', receivedAt: { lt: staleSince } },
        });

        liveWebhookEvents = {
          last24hCount,
          recent,
          typesLast24h,
          missingRequired,
          statusLast24h,
          staleProcessingCount,
        };
        if (last24hCount === 0) warnings.push('no_recent_live_webhook_events');
      } catch (error) {
        warnings.push('stripe_event_persistence_not_available');
        log({ level: 'warn', msg: 'stripe_validate_live_events_failed', requestId, error });
      }
    }

    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, slug: true, price: true, currency: true, interval: true, stripePriceId: true },
    });

    const planChecks = [];
    for (const plan of plans) {
      const stripePriceId = plan?.stripePriceId ? String(plan.stripePriceId) : null;
      if (!stripePriceId) continue;

      const check = {
        planId: plan.id,
        slug: plan.slug,
        stripePriceId,
        ok: true,
        issues: [],
        stripe: null,
      };

      if (stripePriceId.includes('PLACEHOLDER')) {
        check.ok = false;
        check.issues.push('stripePriceId_placeholder');
        planChecks.push(check);
        continue;
      }

      try {
        const price = await stripe.prices.retrieve(stripePriceId);
        const product = price?.product ? await stripe.products.retrieve(price.product) : null;

        const currency = String(price?.currency || '').toUpperCase();
        const expectedCurrency = String(plan.currency || '').toUpperCase();
        if (expectedCurrency && currency && currency !== expectedCurrency) {
          check.ok = false;
          check.issues.push('currency_mismatch');
        }

        const expectedAmount = Math.round(Number(plan.price || 0) * 100);
        const unitAmount = typeof price?.unit_amount === 'number' ? price.unit_amount : null;
        if (unitAmount !== null && expectedAmount !== unitAmount) {
          check.ok = false;
          check.issues.push('amount_mismatch');
        }

        if (!price?.active) {
          check.ok = false;
          check.issues.push('price_inactive');
        }

        const isRecurring = Boolean(price?.recurring);
        if (!isRecurring) {
          check.ok = false;
          check.issues.push('price_not_recurring');
        }

        const metaType = String(product?.metadata?.type || '').toUpperCase();
        if (!metaType) {
          check.ok = false;
          check.issues.push('product_metadata_type_missing');
        } else if (metaType !== 'STANDARD' && metaType !== 'PREMIUM' && metaType !== 'FREE') {
          check.ok = false;
          check.issues.push('product_metadata_type_invalid');
        }

        const expectedType = String(plan.slug || '').toUpperCase();
        if ((expectedType === 'STANDARD' || expectedType === 'PREMIUM') && metaType && metaType !== expectedType) {
          check.ok = false;
          check.issues.push('product_type_mismatch');
        }

        check.stripe = {
          price: { id: price?.id || null, currency: price?.currency || null, unit_amount: price?.unit_amount ?? null, active: !!price?.active },
          product: { id: product?.id || null, active: !!product?.active, metadataType: product?.metadata?.type || null },
        };
      } catch (error) {
        check.ok = false;
        check.issues.push('stripe_retrieve_failed');
        log({ level: 'warn', msg: 'stripe_validate_plan_failed', requestId, stripePriceId, error });
      }

      planChecks.push(check);
    }

    const blockingIssues = [];
    if (!appUrl) blockingIssues.push('missing_app_url');
    if (!secretKey) blockingIssues.push('missing_payments_secret_key');
    if (!publishableKey) blockingIssues.push('missing_stripe_publishable_key');
    if (!webhookSecret) blockingIssues.push('missing_stripe_webhook_secret');
    if (mode.isLiveKey && !String(publishableKey || '').startsWith('pk_live_')) {
      blockingIssues.push('publishable_key_not_live');
    }
    if (mode.isLiveKey && balance?.livemode !== true) {
      blockingIssues.push('stripe_balance_not_livemode');
    }
    if (!billingPortalConfigurationId) {
      blockingIssues.push('missing_billing_portal_configuration_id');
    } else if (!billingPortalConfigurationOk) {
      blockingIssues.push('billing_portal_configuration_invalid');
    }
    if (mode.isLiveKey && expectedWebhookUrl && !webhookEndpointOk) {
      blockingIssues.push('webhook_endpoint_misconfigured');
    }

    res.status(200).json({
      data: {
        mode,
        stripe: { livemode: balance?.livemode === true },
        billingPortal: {
          configurationId: billingPortalConfigurationId || null,
          configurationOk: billingPortalConfigurationOk,
        },
        webhook: {
          endpoint: expectedWebhookUrl,
          secretSelfTest: webhookSecretOk,
          endpointCheck: {
            ok: webhookEndpointOk,
            issues: webhookEndpointIssues,
            endpoint: webhookEndpointMatch
              ? {
                id: webhookEndpointMatch.id || null,
                status: webhookEndpointMatch.status || null,
                enabledEventsCount: Array.isArray(webhookEndpointMatch.enabled_events)
                  ? webhookEndpointMatch.enabled_events.length
                  : null,
                hasWildcard: Array.isArray(webhookEndpointMatch.enabled_events)
                  ? webhookEndpointMatch.enabled_events.includes('*')
                  : false,
              }
              : null,
          },
        },
        configs,
        plans: planChecks,
        blockingIssues,
        warnings,
        liveWebhookEvents,
      },
    });
  } catch (error) {
    log({ level: 'error', msg: 'stripe_validate_failed', requestId, error });
    reportError(error, { route: '/api/admin/stripe/validate', requestId });
    res.status(500).json({ errors: { error: { msg: 'Unable to validate Stripe configuration' } } });
  }
};

export default handler;
