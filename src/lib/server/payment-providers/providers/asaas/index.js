import PaymentProviderInterface from '../../PaymentProviderInterface';

const getBaseUrl = (environment) =>
  environment === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';

const asaasRequest = async ({ credential, environment, path, method, body, headers }) => {
  const url = `${getBaseUrl(environment)}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      access_token: credential.apiKey,
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.errors?.[0]?.description || json?.message || `Asaas error (${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.details = json;
    throw err;
  }
  return json;
};

const mapAsaasStatusToLocal = (asaasStatus) => {
  const status = String(asaasStatus || '').toUpperCase();
  if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status)) return 'PAID';
  if (['CANCELLED', 'DELETED'].includes(status)) return 'CANCELED';
  if (['OVERDUE', 'REFUNDED', 'CHARGEBACK'].includes(status)) return 'FAILED';
  return 'PENDING';
};

export default class AsaasProvider extends PaymentProviderInterface {
  async createCustomer({ name, email, phone, externalReference }) {
    return await asaasRequest({
      credential: this.credential,
      environment: this.environment,
      path: '/customers',
      method: 'POST',
      body: {
        name,
        email: email || undefined,
        phone: phone || undefined,
        mobilePhone: phone || undefined,
        externalReference: externalReference || undefined,
      },
    });
  }

  async createPayment({
    customerId,
    billingType,
    amount,
    dueDate,
    description,
    externalReference,
    callback,
    recipientAccountId,
    splitFixedValue,
  }) {
    const payment = await asaasRequest({
      credential: this.credential,
      environment: this.environment,
      path: '/payments',
      method: 'POST',
      body: {
        customer: customerId,
        billingType,
        value: Number(amount),
        dueDate: dueDate ? String(dueDate).slice(0, 10) : undefined,
        description: description || undefined,
        externalReference: externalReference || undefined,
        callback: callback || undefined,
        split:
          recipientAccountId && Number(splitFixedValue || 0) > 0
            ? [
              {
                walletId: String(recipientAccountId),
                fixedValue: Number(splitFixedValue),
              },
            ]
            : undefined,
      },
    });

    return {
      providerPaymentId: payment?.id || null,
      status: mapAsaasStatusToLocal(payment?.status),
      paymentLink: payment?.invoiceUrl || null,
      raw: payment,
    };
  }

  async createPaymentLink({ providerPaymentId }) {
    const payment = await asaasRequest({
      credential: this.credential,
      environment: this.environment,
      path: `/payments/${providerPaymentId}`,
      method: 'GET',
    });
    return {
      paymentLink: payment?.invoiceUrl || null,
      raw: payment,
    };
  }

  async getPayment({ providerPaymentId }) {
    const payment = await asaasRequest({
      credential: this.credential,
      environment: this.environment,
      path: `/payments/${providerPaymentId}`,
      method: 'GET',
    });

    return {
      providerPaymentId: payment?.id || providerPaymentId,
      status: mapAsaasStatusToLocal(payment?.status),
      paymentLink: payment?.invoiceUrl || null,
      raw: payment,
    };
  }

  async refundPayment({ providerPaymentId, value }) {
    const refund = await asaasRequest({
      credential: this.credential,
      environment: this.environment,
      path: `/payments/${providerPaymentId}/refund`,
      method: 'POST',
      body: value ? { value: Number(value) } : undefined,
    });

    return { raw: refund };
  }

  async handleWebhook({ req }) {
    const receivedToken = req.headers['asaas-access-token'];
    const expectedToken = this.credential.webhookSecret || null;

    if (expectedToken && receivedToken !== expectedToken) {
      const err = new Error('Invalid webhook token');
      err.statusCode = 401;
      throw err;
    }

    const payload = req.body || {};
    const payment = payload?.payment || payload?.data?.payment || payload?.paymentDto || null;
    if (!payment?.id) return { eventType: null, providerPaymentId: null, status: null, raw: payload };

    const status = mapAsaasStatusToLocal(payment.status || payload?.event || payload?.type);
    const eventType =
      status === 'PAID' ? 'payment_paid' : status === 'FAILED' ? 'payment_failed' : 'payment_updated';

    return {
      eventType,
      providerPaymentId: payment.id,
      status,
      raw: payload,
    };
  }
}
