import initStripe from 'stripe';
import PaymentProviderInterface from '../../PaymentProviderInterface';

const mapStripeStatus = (eventType) => {
  const type = String(eventType || '').toLowerCase();
  if (type === 'checkout.session.completed' || type === 'payment_intent.succeeded') return 'PAID';
  if (type === 'checkout.session.expired' || type === 'payment_intent.payment_failed') return 'FAILED';
  return 'PENDING';
};

export default class StripeProvider extends PaymentProviderInterface {
  getClient() {
    if (!this.credential?.apiKey) throw new Error('Stripe apiKey missing');
    if (!this._stripe) this._stripe = initStripe(this.credential.apiKey);
    return this._stripe;
  }

  async createCustomer({ email, name, metadata }) {
    const stripe = this.getClient();
    const customer = await stripe.customers.create({
      email: email || undefined,
      name: name || undefined,
      metadata: metadata || undefined,
    });
    return customer;
  }

  async createPayment({ customerId, amount, currency, description, metadata, successUrl, cancelUrl }) {
    const stripe = this.getClient();
    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: (currency || 'brl').toLowerCase(),
            unit_amount: Math.round(Number(amount) * 100),
            product_data: { name: description || 'Payment' },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || undefined,
    });

    return {
      providerPaymentId: session?.id || null,
      status: 'PENDING',
      paymentLink: session?.url || null,
      raw: session,
    };
  }

  async createPaymentLink({ providerPaymentId }) {
    const stripe = this.getClient();
    const session = await stripe.checkout.sessions.retrieve(providerPaymentId);
    return {
      paymentLink: session?.url || null,
      raw: session,
    };
  }

  async getPayment({ providerPaymentId }) {
    const stripe = this.getClient();
    const session = await stripe.checkout.sessions.retrieve(providerPaymentId);
    const status = session?.payment_status === 'paid' ? 'PAID' : 'PENDING';
    return {
      providerPaymentId,
      status,
      paymentLink: session?.url || null,
      raw: session,
    };
  }

  async refundPayment({ providerPaymentId, amount }) {
    const stripe = this.getClient();
    const session = await stripe.checkout.sessions.retrieve(providerPaymentId);
    const paymentIntentId = session?.payment_intent;
    if (!paymentIntentId) throw new Error('No payment_intent found');
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(Number(amount) * 100) : undefined,
    });
    return { raw: refund };
  }

  async handleWebhook({ req, rawBody }) {
    const stripe = this.getClient();
    const signature = req.headers['stripe-signature'];
    const secret = this.credential.webhookSecret || null;
    if (!secret) throw new Error('Stripe webhook secret missing');
    if (!signature) throw new Error('Stripe signature missing');

    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    const status = mapStripeStatus(event.type);

    const providerPaymentId =
      event?.data?.object?.id ||
      event?.data?.object?.checkout_session ||
      event?.data?.object?.payment_intent ||
      null;

    const eventType =
      status === 'PAID' ? 'payment_paid' : status === 'FAILED' ? 'payment_failed' : 'payment_updated';

    return { eventType, providerPaymentId, status, raw: event };
  }
}
