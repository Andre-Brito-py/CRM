import { validateSession } from '@/config/api-validation';
import getStripe from '@/lib/server/stripe';
import { getPayment } from '@/prisma/services/customer';
import { getSystemConfig } from '@/lib/server/config';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ errors: { error: { msg: 'Method not supported' } } });
    return;
  }

  try {
    const session = await validateSession(req, res);

    const appUrl = await getSystemConfig('APP_URL', process.env.APP_URL);
    if (!appUrl) {
      res.status(500).json({ errors: { error: { msg: 'APP_URL is missing' } } });
      return;
    }

    const customerPayment = await getPayment(session.user?.email);
    if (!customerPayment?.paymentId) {
      res.status(400).json({ errors: { error: { msg: 'Customer payment account not found' } } });
      return;
    }

    const stripe = await getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerPayment.paymentId,
      return_url: `${appUrl}/account/billing`,
    });

    res.status(200).json({ data: { url: portalSession.url } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: { error: { msg: 'Unable to create billing portal session' } } });
  }
};

export default handler;
