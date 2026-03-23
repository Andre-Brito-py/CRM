import { validateSession } from '@/config/api-validation';
import getStripe from '@/lib/server/stripe';
import { getPayment } from '@/prisma/services/customer';
import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: 'Method not supported' } } });
  }

  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  try {
    const session = await validateSession(req, res);
    const customerPayment = await getPayment(session.user?.email);

    if (!customerPayment?.providerSubscriptionId) {
      return res.status(400).json({ errors: { error: { msg: 'No active subscription found' } } });
    }

    const stripe = await getStripe();
    const subscription = await stripe.subscriptions.retrieve(customerPayment.providerSubscriptionId);
    
    const item = subscription.items.data[0];
    const price = item.price;
    const isAnnual = price.recurring.interval === 'year';
    
    let totalFee = 0;
    if (isAnnual) {
        const product = await stripe.products.retrieve(price.product);
        const planType = String(product.metadata.type || 'STANDARD').toUpperCase();
        const plan = await prisma.plan.findUnique({
          where: { slug: planType },
          select: { cancellationFeePercentage: true, price: true }
        });

        const feePercentage = plan?.cancellationFeePercentage || 0;
        if (feePercentage > 0) {
            const now = Math.floor(Date.now() / 1000);
            const end = subscription.current_period_end;
            const remainingMonths = Math.ceil((end - now) / (30 * 24 * 60 * 60));
            const monthlyEquivalent = (price.unit_amount / 100) / 12;
            totalFee = Math.round(remainingMonths * monthlyEquivalent * (feePercentage / 100) * 100) / 100;
        }
    }

    // If there's a fee, charge it
    if (totalFee > 0) {
        // Create an invoice item for the penalty
        await stripe.invoiceItems.create({
            customer: customerPayment.paymentId,
            amount: Math.round(totalFee * 100),
            currency: price.currency,
            description: `Taxa de cancelamento antecipado (Plano Anual) - ${totalFee} ${price.currency.toUpperCase()}`,
            subscription: subscription.id,
        });

        // Immediately invoice the customer for this specific item if desired
        // Or just let it be billed on the next (final) invoice.
        // Usually for penalties, we want an immediate invoice.
        await stripe.invoices.create({
            customer: customerPayment.paymentId,
            subscription: subscription.id,
            description: 'Fatura de Encerramento Antecipado',
            auto_advance: true,
        }).catch(err => {
            log({ level: 'warn', msg: 'immediate_invoice_failed', error: err });
        });
    }

    // Cancel the subscription at the end of the period (or immediately)
    // The user said "cancelar suas assinaturas", usually in SaaS this means cancel at period end.
    // BUT since they are paying a fee, maybe they expect immediate cancellation?
    // "pagando um percentual com base nas faturas restantes" implies they are EXITING early.
    // Let's do immediate cancellation if they pay the fee.
    await stripe.subscriptions.del(subscription.id, {
        invoice_now: totalFee > 0, // Ensure any pending items are invoiced
        prorate: false 
    });

    // Update DB
    await prisma.customerPayment.updateMany({
        where: { paymentId: customerPayment.paymentId },
        data: {
            subscriptionType: 'FREE',
            providerSubscriptionId: null,
            currentPeriodEnd: null,
            pendingSubscriptionType: null,
            pendingEffectiveAt: null,
            pendingStripePriceId: null
        }
    });

    res.status(200).json({ data: { success: true, feeCharged: totalFee } });

  } catch (error) {
    log({ level: 'error', msg: 'subscription_cancel_confirm_failed', requestId, error });
    reportError(error, { route: '/api/payments/subscription/cancel-confirm', requestId });
    res.status(500).json({ errors: { error: { msg: 'Unable to process cancellation' } } });
  }
}
