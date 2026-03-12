import PaymentProviderInterface from '../../PaymentProviderInterface';
import crypto from 'crypto';

const mpRequest = async ({ credential, path, method, body, headers }) => {
  const url = `https://api.mercadopago.com${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${credential.apiKey}`,
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.message || json?.error || `Mercado Pago error (${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.details = json;
    throw err;
  }
  return json;
};

const mapMercadoPagoStatusToLocal = (mpStatus, mpStatusDetail) => {
  const s = String(mpStatus || '').toLowerCase();
  const d = String(mpStatusDetail || '').toLowerCase();
  if (s === 'approved') return 'PAID';
  if (s === 'cancelled') return 'CANCELED';
  if (s === 'rejected') return 'FAILED';
  if (s === 'refunded' || s === 'charged_back') return 'FAILED';
  if (s === 'in_process' || s === 'pending') return 'PENDING';
  if (d.includes('cc_rejected') || d.includes('rejected')) return 'FAILED';
  return 'PENDING';
};

const parseMercadoPagoSignature = (headerValue) => {
  const value = String(headerValue || '');
  if (!value) return null;
  const parts = value.split(',').map((p) => p.trim());
  const parsed = {};
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k && v) parsed[k.trim()] = v.trim();
  }
  if (!parsed.ts || !parsed.v1) return null;
  return { ts: parsed.ts, v1: parsed.v1 };
};

const verifyMercadoPagoWebhook = ({ secret, xSignature, xRequestId, dataId }) => {
  if (!secret) return true;
  const parsed = parseMercadoPagoSignature(xSignature);
  if (!parsed || !xRequestId || !dataId) return false;
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${parsed.ts};`;
  const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(digest);
  const b = Buffer.from(String(parsed.v1 || ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

export default class MercadoPagoProvider extends PaymentProviderInterface {
  async createCustomer() {
    return null;
  }

  async createPayment({
    billingType,
    amount,
    currency,
    description,
    externalReference,
    successUrl,
    cancelUrl,
    metadata,
    recipientAccountId,
    platformFee,
  }) {
    const appUrl = successUrl ? new URL(successUrl).origin : cancelUrl ? new URL(cancelUrl).origin : null;
    const notificationUrl = appUrl ? `${appUrl}/api/webhooks/payments?provider=mercadopago` : undefined;
    const collectorId = recipientAccountId && String(recipientAccountId).match(/^\d+$/) ? Number(recipientAccountId) : null;
    const marketplaceFee = Number(platformFee || 0) > 0 ? Number(platformFee) : null;

    const preference = await mpRequest({
      credential: this.credential,
      path: '/checkout/preferences',
      method: 'POST',
      body: {
        external_reference: externalReference || undefined,
        collector_id: collectorId || undefined,
        marketplace_fee: marketplaceFee || undefined,
        notification_url: notificationUrl || undefined,
        back_urls: {
          success: successUrl || undefined,
          failure: cancelUrl || undefined,
          pending: successUrl || undefined,
        },
        auto_return: 'approved',
        items: [
          {
            title: description || `Pagamento ${String(externalReference || '')}`.trim() || 'Pagamento',
            quantity: 1,
            currency_id: String(currency || 'BRL').toUpperCase(),
            unit_price: Number(amount || 0),
          },
        ],
        payment_methods: billingType
          ? {
            excluded_payment_methods: [],
            excluded_payment_types:
              String(billingType || '').toUpperCase() === 'PIX'
                ? [{ id: 'ticket' }, { id: 'credit_card' }, { id: 'debit_card' }]
                : undefined,
          }
          : undefined,
        metadata: metadata || undefined,
      },
    });

    const link = this.environment === 'production' ? preference?.init_point : preference?.sandbox_init_point || preference?.init_point;

    return {
      providerPaymentId: preference?.id || null,
      status: 'PENDING',
      paymentLink: link || null,
      raw: preference,
    };
  }

  async createPaymentLink({ providerPaymentId }) {
    const preference = await mpRequest({
      credential: this.credential,
      path: `/checkout/preferences/${providerPaymentId}`,
      method: 'GET',
    });
    const link = this.environment === 'production' ? preference?.init_point : preference?.sandbox_init_point || preference?.init_point;
    return { paymentLink: link || null, raw: preference };
  }

  async getPayment({ providerPaymentId }) {
    const payment = await mpRequest({
      credential: this.credential,
      path: `/v1/payments/${providerPaymentId}`,
      method: 'GET',
    });
    return {
      providerPaymentId: payment?.id ? String(payment.id) : providerPaymentId,
      status: mapMercadoPagoStatusToLocal(payment?.status, payment?.status_detail),
      paymentLink: payment?.transaction_details?.external_resource_url || payment?.point_of_interaction?.transaction_data?.ticket_url || null,
      externalReference: payment?.external_reference || null,
      raw: payment,
    };
  }

  async refundPayment({ providerPaymentId, value }) {
    const refund = await mpRequest({
      credential: this.credential,
      path: `/v1/payments/${providerPaymentId}/refunds`,
      method: 'POST',
      body: value ? { amount: Number(value) } : {},
    });
    return { raw: refund };
  }

  async handleWebhook({ req }) {
    const dataId = req.query?.['data.id'] || req.body?.data?.id || req.body?.id || null;
    if (!dataId) return { eventType: null, providerPaymentId: null, status: null, raw: req.body || {} };

    const ok = verifyMercadoPagoWebhook({
      secret: this.credential.webhookSecret || null,
      xSignature: req.headers['x-signature'],
      xRequestId: req.headers['x-request-id'],
      dataId: String(dataId),
    });

    if (!ok) {
      const err = new Error('Invalid webhook signature');
      err.statusCode = 401;
      throw err;
    }

    const type = String(req.query?.type || req.body?.type || '').toLowerCase();
    if (type && type !== 'payment') {
      return { eventType: type, providerPaymentId: String(dataId), status: null, raw: req.body || {} };
    }

    const payment = await this.getPayment({ providerPaymentId: String(dataId) });
    const eventType = payment?.status === 'PAID' ? 'payment_paid' : payment?.status === 'FAILED' ? 'payment_failed' : 'payment_updated';

    return {
      eventType,
      providerPaymentId: payment?.providerPaymentId || String(dataId),
      status: payment?.status || null,
      externalReference: payment?.externalReference || null,
      raw: req.body || {},
    };
  }
}
