import { validateSession } from '@/config/api-validation';
import getStripe from '@/lib/server/stripe';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'POST') {
    try {
      const session = await validateSession(req, res);
      const { priceId } = req.query;
      const stripe = await getStripe();

      if (!process.env.APP_URL) {
        res.status(500).json({ errors: { error: { msg: 'APP_URL is missing' } } });
        return;
      }

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

      const paymentSession = await stripe.checkout.sessions.create({
        customer: customerPayment.paymentId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${process.env.APP_URL}/account/payment?status=success`,
        cancel_url: `${process.env.APP_URL}/account/payment?status=cancelled`,
        metadata: {
          customerId: customerPayment.customerId,
          type: product.metadata.type,
        },
      });

      res.status(200).json({ data: { sessionId: paymentSession.id } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ errors: { error: { msg: 'Unable to create subscription checkout session' } } });
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
