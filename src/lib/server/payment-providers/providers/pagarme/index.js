import PaymentProviderInterface from '../../PaymentProviderInterface';
import crypto from 'crypto';

const basicAuthHeader = (apiKey) => {
  const token = Buffer.from(`${String(apiKey || '').trim()}:`).toString('base64');
  return `Basic ${token}`;
};

const pagarmeRequest = async ({ credential, path, method, body, headers }) => {
  const url = `https://api.pagar.me${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: basicAuthHeader(credential.apiKey),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.message || json?.errors?.[0]?.message || `Pagar.me error (${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.details = json;
    throw err;
  }
  return json;
};

const pagarmeCheckoutCreate = async ({ credential, body }) => {
  const candidates = ['/checkout/v1/checkouts', '/checkout/v1/links', '/checkout/v1/checkout'];
  let lastErr = null;
  for (const path of candidates) {
    try {
      return await pagarmeRequest({ credential, path, method: 'POST', body });
    } catch (err) {
      lastErr = err;
      if (err?.statusCode && err.statusCode !== 404) throw err;
    }
  }
  throw lastErr || new Error('Pagar.me checkout endpoint not found');
};

const pagarmeCheckoutGet = async ({ credential, checkoutId }) => {
  const candidates = [`/checkout/v1/checkouts/${checkoutId}`, `/checkout/v1/links/${checkoutId}`, `/checkout/v1/checkout/${checkoutId}`];
  let lastErr = null;
  for (const path of candidates) {
    try {
      return await pagarmeRequest({ credential, path, method: 'GET' });
    } catch (err) {
      lastErr = err;
      if (err?.statusCode && err.statusCode !== 404) throw err;
    }
  }
  throw lastErr || new Error('Pagar.me checkout endpoint not found');
};

const mapPagarmeEventToLocalStatus = (eventType) => {
  const t = String(eventType || '').toLowerCase();
  if (t.includes('paid') || t.includes('payment_succeeded') || t.includes('succeeded')) return 'PAID';
  if (t.includes('canceled') || t.includes('cancelled')) return 'CANCELED';
  if (t.includes('failed') || t.includes('refused') || t.includes('rejected')) return 'FAILED';
  return 'PENDING';
};

const extractExternalReference = (value) => {
  const s = String(value || '');
  const match = s.match(/payment:([a-z0-9_-]{10,})/i);
  return match?.[1] || null;
};

const verifyPagarmeWebhook = ({ secret, signatureHeader, rawBody }) => {
  if (!secret) return true;
  const header = String(signatureHeader || '');
  if (!header || !rawBody) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expected = header.startsWith('sha256=') ? `sha256=${digest}` : digest;
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

export default class PagarmeProvider extends PaymentProviderInterface {
  async createCustomer() {
    return null;
  }

  async createPayment({ billingType, amount, description, externalReference, metadata, recipientAccountId, splitFixedValue }) {
    const normalized = String(billingType || 'PIX').toUpperCase();
    const accepted =
      normalized === 'BOLETO' ? ['boleto'] : normalized === 'CREDIT_CARD' ? ['credit_card'] : ['pix'];
    const cents = Math.round(Number(amount || 0) * 100);
    const splitCents = Math.round(Number(splitFixedValue || 0) * 100);
    const split =
      recipientAccountId && splitCents > 0 && splitCents <= cents
        ? [
            {
              type: 'flat',
              amount: splitCents,
              recipient_id: String(recipientAccountId),
              options: {
                liable: false,
                charge_processing_fee: false,
                charge_remainder_fee: false,
              },
            },
          ]
        : undefined;

    const bodyWithSplit = {
        is_building: false,
        payment_settings: {
          accepted_payment_methods: accepted,
          credit_card_settings: accepted.includes('credit_card')
            ? {
              operation_type: 'auth_and_capture',
            }
            : undefined,
        },
        cart_settings: {
          items: [
            {
              amount: cents,
              name: description || `Pagamento ${String(externalReference || '')}`.trim() || 'Pagamento',
              default_quantity: 1,
            },
          ],
        },
        name: `payment:${String(externalReference || '')}`.trim(),
        type: 'order',
        split,
        metadata: metadata || undefined,
      };

    let checkout = null;
    try {
      checkout = await pagarmeCheckoutCreate({
        credential: this.credential,
        body: bodyWithSplit,
      });
    } catch (err) {
      if (split || metadata) {
        checkout = await pagarmeCheckoutCreate({
          credential: this.credential,
          body: {
            ...bodyWithSplit,
            split: undefined,
            metadata: undefined,
          },
        });
      } else {
        throw err;
      }
    }

    return {
      providerPaymentId: checkout?.id || null,
      status: 'PENDING',
      paymentLink: checkout?.url || null,
      raw: checkout,
    };
  }

  async createPaymentLink({ providerPaymentId }) {
    const checkout = await pagarmeCheckoutGet({ credential: this.credential, checkoutId: providerPaymentId });
    return { paymentLink: checkout?.url || null, raw: checkout };
  }

  async getPayment({ providerPaymentId }) {
    const checkout = await pagarmeCheckoutGet({ credential: this.credential, checkoutId: providerPaymentId });
    return {
      providerPaymentId,
      status: mapPagarmeEventToLocalStatus(checkout?.status),
      paymentLink: checkout?.url || null,
      raw: checkout,
    };
  }

  async refundPayment() {
    throw new Error('Pagar.me refundPayment not supported by checkout link');
  }

  async handleWebhook({ req, rawBody }) {
    const ok = verifyPagarmeWebhook({
      secret: this.credential.webhookSecret || null,
      signatureHeader: req.headers['x-hub-signature-256'],
      rawBody,
    });
    if (!ok) {
      const err = new Error('Invalid webhook signature');
      err.statusCode = 401;
      throw err;
    }

    const payload = req.body || {};
    const eventType = payload?.type || payload?.event || payload?.action || null;
    const data = payload?.data || payload;

    const providerPaymentId =
      data?.id ||
      data?.checkout?.id ||
      data?.order?.id ||
      data?.charge?.id ||
      payload?.id ||
      null;

    const externalReference =
      extractExternalReference(data?.name) ||
      extractExternalReference(data?.checkout?.name) ||
      data?.order?.code ||
      data?.metadata?.paymentId ||
      null;

    const status = mapPagarmeEventToLocalStatus(eventType);
    const normalizedEvent =
      status === 'PAID' ? 'payment_paid' : status === 'FAILED' || status === 'CANCELED' ? 'payment_failed' : 'payment_updated';

    return {
      eventType: normalizedEvent,
      providerPaymentId: providerPaymentId ? String(providerPaymentId) : null,
      status,
      externalReference: externalReference ? String(externalReference) : null,
      raw: payload,
    };
  }
}
