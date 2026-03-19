import { validateSession } from '@/config/api-validation';
import getStripe from '@/lib/server/stripe';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';
import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ errors: { error: { msg: 'Method not supported' } } });
    return;
  }

  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  try {
    const session = await validateSession(req, res);

    const appUrl = await getSystemConfig('APP_URL', process.env.APP_URL);
    if (!appUrl) {
      res.status(500).json({ errors: { error: { msg: 'APP_URL is missing' } } });
      return;
    }

    const email = session.user?.email || null;
    const userId = session.user?.userId || session.user?.id || null;
    if (!email || !userId) {
      res.status(401).json({ errors: { error: { msg: 'Unauthorized' } } });
      return;
    }

    let customerPayment = await getPayment(email);
    if (!customerPayment) {
      await createPaymentAccount(email, userId);
      customerPayment = await getPayment(email);
    }
    if (!customerPayment?.paymentId) {
      res.status(400).json({ errors: { error: { msg: 'Customer payment account not found' } } });
      return;
    }

    const configuration = await getSystemConfig(
      'STRIPE_BILLING_PORTAL_CONFIGURATION_ID',
      process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID
    );

    const stripe = await getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerPayment.paymentId,
      return_url: `${appUrl}/account/billing`,
      configuration: configuration || undefined,
    });

    res.status(200).json({ data: { url: portalSession.url } });
  } catch (error) {
    log({ level: 'error', msg: 'billing_portal_session_failed', requestId, error });
    reportError(error, { route: '/api/payments/portal', requestId });
    res.status(500).json({ errors: { error: { msg: 'Unable to create billing portal session' } } });
  }
};

export default handler;
