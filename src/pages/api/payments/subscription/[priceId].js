import { validateSession } from '@/config/api-validation';
import getStripe from '@/lib/server/stripe';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';
import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';
import prisma from '@/prisma/index';

const resolveSubscriptionTypeFromStripe = async (stripe, subscription) => {
  const currentPriceId = subscription?.items?.data?.[0]?.price?.id || null;
  if (!currentPriceId) return 'FREE';
  const price = await stripe.prices.retrieve(currentPriceId);
  const product = await stripe.products.retrieve(price.product);
  return String(product?.metadata?.type || 'STANDARD').toUpperCase();
};

const subscriptionRank = (type) => {
  const normalized = String(type || '').trim().toUpperCase();
  if (normalized === 'PREMIUM') return 3;
  if (normalized === 'STANDARD') return 2;
  return 1;
};

const pickBestSubscription = (subscriptions) => {
  const items = Array.isArray(subscriptions?.data) ? subscriptions.data : [];
  return (
    items.find((s) => s.status === 'active' || s.status === 'trialing') ||
    items.sort((a, b) => (b.created || 0) - (a.created || 0))[0] ||
    null
  );
};

const handler = async (req, res) => {
  const { method } = req;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  if (method === 'POST') {
    try {
      const session = await validateSession(req, res);
      const { priceId } = req.query;
      const stripe = await getStripe();

      const appUrl = await getSystemConfig('APP_URL', process.env.APP_URL);
      if (!appUrl) {
        res.status(500).json({ errors: { error: { msg: 'APP_URL is missing' } } });
        return;
      }

      const automaticTax = await getSystemConfig('STRIPE_AUTOMATIC_TAX', process.env.STRIPE_AUTOMATIC_TAX);
      const taxIdCollection = await getSystemConfig('STRIPE_TAX_ID_COLLECTION', process.env.STRIPE_TAX_ID_COLLECTION);
      const billingAddressCollection = await getSystemConfig(
        'STRIPE_BILLING_ADDRESS_COLLECTION',
        process.env.STRIPE_BILLING_ADDRESS_COLLECTION
      );
      const isTruthy = (value) => {
        const v = String(value || '').trim().toLowerCase();
        return v === 'true' || v === '1' || v === 'yes' || v === 'on';
      };
      const automaticTaxEnabled = isTruthy(automaticTax);
      const taxIdCollectionEnabled = isTruthy(taxIdCollection);
      const normalizedBillingAddressCollection = ['auto', 'required'].includes(
        String(billingAddressCollection || '').trim().toLowerCase()
      )
        ? String(billingAddressCollection).trim().toLowerCase()
        : null;

      let customerPayment = await getPayment(session.user?.email);
      if (!customerPayment) {
        await createPaymentAccount(session.user?.email, session.user?.userId);
        customerPayment = await getPayment(session.user?.email);
      }

      if (!customerPayment?.paymentId) {
        res.status(400).json({ errors: { error: { msg: 'Customer payment account not found' } } });
        return;
      }

      const price = await stripe.prices.retrieve(priceId);
      const product = await stripe.products.retrieve(price.product);
      const targetType = String(product?.metadata?.type || 'STANDARD').toUpperCase();

      const subscriptions = await stripe.subscriptions.list({
        customer: customerPayment.paymentId,
        status: 'all',
        limit: 10,
      });
      const current = pickBestSubscription(subscriptions);

      if (current) {
        const currentPriceId = current?.items?.data?.[0]?.price?.id || null;
        const currentType = await resolveSubscriptionTypeFromStripe(stripe, current);

        if (currentPriceId === price.id) {
          res.status(200).json({ data: { action: 'noop', subscriptionType: currentType } });
          return;
        }

        if (subscriptionRank(targetType) > subscriptionRank(currentType)) {
          if (current?.schedule) {
            try {
              await stripe.subscriptionSchedules.release(current.schedule);
            } catch (error) {
              log({
                level: 'warn',
                msg: 'subscription_upgrade_schedule_release_failed',
                requestId,
                scheduleId: current.schedule,
                error,
              });
            }
          }

          const itemId = current?.items?.data?.[0]?.id || null;
          if (!itemId) {
            res.status(400).json({ errors: { error: { msg: 'Subscription item not found' } } });
            return;
          }

          const updated = await stripe.subscriptions.update(current.id, {
            items: [{ id: itemId, price: price.id }],
            proration_behavior: 'create_prorations',
            metadata: {
              ...(current.metadata || {}),
              type: targetType,
            },
          });

          await prisma.customerPayment.updateMany({
            where: { paymentId: customerPayment.paymentId },
            data: {
              subscriptionType: targetType,
              providerSubscriptionId: updated.id,
              currentPeriodEnd: updated?.current_period_end
                ? new Date(Number(updated.current_period_end) * 1000)
                : null,
              pendingSubscriptionType: null,
              pendingEffectiveAt: null,
              pendingStripePriceId: null,
            },
          });

          res.status(200).json({
            data: {
              action: 'updated',
              subscriptionType: targetType,
            },
          });
          return;
        }

        const startDate = Number(current.current_period_start || 0);
        const endDate = Number(current.current_period_end || 0);
        if (!startDate || !endDate) {
          res.status(400).json({ errors: { error: { msg: 'Subscription billing cycle missing' } } });
          return;
        }

        const schedule =
          current?.schedule
            ? await stripe.subscriptionSchedules.retrieve(current.schedule)
            : await stripe.subscriptionSchedules.create({ from_subscription: current.id });

        await stripe.subscriptionSchedules.update(schedule.id, {
          end_behavior: 'release',
          proration_behavior: 'none',
          phases: [
            {
              start_date: startDate,
              end_date: endDate,
              items: [{ price: currentPriceId, quantity: 1 }],
            },
            {
              start_date: endDate,
              items: [{ price: price.id, quantity: 1 }],
            },
          ],
        });

        const effectiveAt = new Date(endDate * 1000);
        await prisma.customerPayment.updateMany({
          where: { paymentId: customerPayment.paymentId },
          data: {
            providerSubscriptionId: current.id,
            currentPeriodEnd: effectiveAt,
            pendingSubscriptionType: targetType,
            pendingEffectiveAt: effectiveAt,
            pendingStripePriceId: price.id,
          },
        });

        res.status(200).json({
          data: {
            action: 'scheduled',
            subscriptionType: currentType,
            pending: {
              subscriptionType: targetType,
              effectiveAt: effectiveAt.toISOString(),
            },
          },
        });
        return;
      }

      const paymentSession = await stripe.checkout.sessions.create({
        customer: customerPayment.paymentId,
        mode: 'subscription',
        payment_method_types: ['card'],
        payment_method_collection: 'always',
        line_items: [{ price: price.id, quantity: 1 }],
        billing_address_collection: automaticTaxEnabled ? 'required' : (normalizedBillingAddressCollection || undefined),
        automatic_tax: automaticTaxEnabled ? { enabled: true } : undefined,
        tax_id_collection: taxIdCollectionEnabled ? { enabled: true } : undefined,
        customer_update: {
          name: 'auto',
          address: 'auto',
        },
        success_url: `${appUrl}/account/payment?status=success`,
        cancel_url: `${appUrl}/account/payment?status=cancelled`,
        allow_promotion_codes: true,
        metadata: {
          customerId: customerPayment.customerId,
          type: targetType,
          automaticTax: automaticTaxEnabled ? 'true' : 'false',
          taxIdCollection: taxIdCollectionEnabled ? 'true' : 'false',
        },
      });

      res.status(200).json({ data: { sessionId: paymentSession.id } });
    } catch (error) {
      log({ level: 'error', msg: 'subscription_checkout_failed', requestId, error });
      reportError(error, { route: '/api/payments/subscription/[priceId]', requestId });
      res.status(500).json({ errors: { error: { msg: 'Unable to create subscription checkout session' } } });
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
