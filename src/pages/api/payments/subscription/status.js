import { validateSession } from '@/config/api-validation';
import { getPayment } from '@/prisma/services/customer';
import { log, reportError } from '@/lib/server/logger';

const handler = async (req, res) => {
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const method = req.method;

  if (method !== 'GET') {
    res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
    return;
  }

  try {
    const session = await validateSession(req, res);
    const customerPayment = await getPayment(session.user?.email);

    res.status(200).json({
      data: {
        subscriptionType: customerPayment?.subscriptionType || 'FREE',
        currentPeriodEnd: customerPayment?.currentPeriodEnd
          ? new Date(customerPayment.currentPeriodEnd).toISOString()
          : null,
        pending: customerPayment?.pendingSubscriptionType
          ? {
              subscriptionType: customerPayment.pendingSubscriptionType,
              effectiveAt: customerPayment?.pendingEffectiveAt
                ? new Date(customerPayment.pendingEffectiveAt).toISOString()
                : null,
            }
          : null,
      },
    });
  } catch (error) {
    log({ level: 'error', msg: 'subscription_status_failed', requestId, error });
    reportError(error, { route: '/api/payments/subscription/status', requestId });
    res.status(500).json({ errors: { error: { msg: 'Unable to fetch subscription status' } } });
  }
};

export default handler;

