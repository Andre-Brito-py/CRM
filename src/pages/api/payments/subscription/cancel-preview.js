import { validateSession } from '@/config/api-validation';
import getStripe from '@/lib/server/stripe';
import { getPayment } from '@/prisma/services/customer';
import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: 'Method not supported' } } });
  }

  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  try {
    const session = await validateSession(req, res);
    const customerPayment = await getPayment(session.user?.email);

    if (!customerPayment?.providerSubscriptionId) {
      return res.status(200).json({ data: { canCancel: true, fee: 0, isAnnual: false } });
    }

    const stripe = await getStripe();
    const subscription = await stripe.subscriptions.retrieve(customerPayment.providerSubscriptionId);
    
    const item = subscription.items.data[0];
    const price = item.price;
    const isAnnual = price.recurring.interval === 'year';
    
    if (!isAnnual) {
      return res.status(200).json({ data: { canCancel: true, fee: 0, isAnnual: false } });
    }

    // Get the plan to find the cancellation fee percentage
    const product = await stripe.products.retrieve(price.product);
    const planType = String(product.metadata.type || 'STANDARD').toUpperCase();
    const plan = await prisma.plan.findUnique({
      where: { slug: planType },
      select: { cancellationFeePercentage: true, price: true }
    });

    const feePercentage = plan?.cancellationFeePercentage || 0;
    if (feePercentage <= 0) {
      return res.status(200).json({ data: { canCancel: true, fee: 0, isAnnual: true } });
    }

    // Calculate remaining months
    const now = Math.floor(Date.now() / 1000);
    const end = subscription.current_period_end;
    const remainingSeconds = Math.max(0, end - now);
    const remainingMonths = Math.ceil(remainingSeconds / (30 * 24 * 60 * 60)); // Approximate month length

    // Monthly equivalent price (if not found in plan, we use annual_price / 12)
    // Actually, price.unit_amount is the annual price if interval is year.
    const monthlyEquivalent = (price.unit_amount / 100) / 12;
    const fee = remainingMonths * monthlyEquivalent * (feePercentage / 100);

    return res.status(200).json({
      data: {
        canCancel: true,
        isAnnual: true,
        remainingMonths,
        feePercentage,
        fee: Math.round(fee * 100) / 100,
        currency: price.currency.toUpperCase(),
        currentPeriodEnd: new Date(end * 1000).toISOString()
      }
    });

  } catch (error) {
    log({ level: 'error', msg: 'subscription_cancel_preview_failed', requestId, error });
    reportError(error, { route: '/api/payments/subscription/cancel-preview', requestId });
    res.status(500).json({ errors: { error: { msg: 'Unable to preview cancellation' } } });
  }
}
