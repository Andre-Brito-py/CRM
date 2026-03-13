import crypto from 'crypto';

import AsaasProvider from '@/lib/server/payment-providers/providers/asaas';
import MercadoPagoProvider from '@/lib/server/payment-providers/providers/mercadopago';
import PagarmeProvider from '@/lib/server/payment-providers/providers/pagarme';
import StripeProvider from '@/lib/server/payment-providers/providers/stripe';

const buildProvider = (ProviderClass, { credential = {}, environment = 'test', provider = {} } = {}) =>
  new ProviderClass({
    provider: { name: ProviderClass.name, ...provider },
    credential,
    environment,
  });

describe('payment webhook parsing (contract)', () => {
  describe('Asaas', () => {
    test('maps status to PAID', async () => {
      const provider = buildProvider(AsaasProvider, { credential: { apiKey: 'x', webhookSecret: 't' } });
      const req = {
        headers: { 'asaas-access-token': 't' },
        body: { payment: { id: 'pay_1', status: 'CONFIRMED' } },
      };

      await expect(provider.handleWebhook({ req })).resolves.toMatchObject({
        eventType: 'payment_paid',
        providerPaymentId: 'pay_1',
        status: 'PAID',
      });
    });

    test('rejects invalid token', async () => {
      const provider = buildProvider(AsaasProvider, { credential: { apiKey: 'x', webhookSecret: 't' } });
      const req = {
        headers: { 'asaas-access-token': 'wrong' },
        body: { payment: { id: 'pay_1', status: 'CONFIRMED' } },
      };

      await expect(provider.handleWebhook({ req })).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('Stripe', () => {
    test('derives providerPaymentId + status from event', async () => {
      const provider = buildProvider(StripeProvider, { credential: { apiKey: 'sk_test', webhookSecret: 'whsec' } });

      const event = {
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_123' } },
      };

      provider.getClient = () => ({
        webhooks: {
          constructEvent: () => event,
        },
      });

      const req = { headers: { 'stripe-signature': 'sig' } };
      const rawBody = Buffer.from('{"a":1}');

      await expect(provider.handleWebhook({ req, rawBody })).resolves.toMatchObject({
        eventType: 'payment_paid',
        providerPaymentId: 'cs_123',
        status: 'PAID',
        raw: event,
      });
    });
  });

  describe('Pagar.me', () => {
    const sign = ({ secret, rawBody }) => {
      const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      return `sha256=${digest}`;
    };

    test('verifies signature and normalizes event', async () => {
      const secret = 'pagarme_secret';
      const provider = buildProvider(PagarmeProvider, { credential: { apiKey: 'x', webhookSecret: secret } });

      const payload = {
        type: 'charge.paid',
        data: { id: 'ch_1', name: 'payment:local_payment_123' },
      };
      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        headers: { 'x-hub-signature-256': sign({ secret, rawBody }) },
        body: payload,
      };

      await expect(provider.handleWebhook({ req, rawBody })).resolves.toMatchObject({
        eventType: 'payment_paid',
        providerPaymentId: 'ch_1',
        status: 'PAID',
        externalReference: 'local_payment_123',
      });
    });

    test('rejects invalid signature', async () => {
      const secret = 'pagarme_secret';
      const provider = buildProvider(PagarmeProvider, { credential: { apiKey: 'x', webhookSecret: secret } });

      const payload = { type: 'charge.paid', data: { id: 'ch_1' } };
      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        headers: { 'x-hub-signature-256': 'sha256=invalid' },
        body: payload,
      };

      await expect(provider.handleWebhook({ req, rawBody })).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('Mercado Pago', () => {
    const buildSignature = ({ secret, dataId, requestId, ts }) => {
      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
      return `ts=${ts},v1=${digest}`;
    };

    const mockFetchOnce = (handler) => {
      const prev = global.fetch;
      global.fetch = jest.fn(handler);
      return () => {
        global.fetch = prev;
      };
    };

    test('verifies signature and resolves payment status via API', async () => {
      const secret = 'mp_secret';
      const provider = buildProvider(MercadoPagoProvider, { credential: { apiKey: 'mp_key', webhookSecret: secret } });

      const dataId = '12345';
      const requestId = 'req_abc';
      const ts = '1700000000';

      const restoreFetch = mockFetchOnce(async (url) => {
        if (String(url).includes(`/v1/payments/${dataId}`)) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: Number(dataId),
              status: 'approved',
              status_detail: 'accredited',
              external_reference: 'local_payment_1',
              transaction_details: { external_resource_url: 'https://example.com' },
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({ message: 'not found' }) };
      });

      const req = {
        headers: {
          'x-signature': buildSignature({ secret, dataId, requestId, ts }),
          'x-request-id': requestId,
        },
        query: { 'data.id': dataId, type: 'payment' },
        body: { data: { id: dataId } },
      };

      await expect(provider.handleWebhook({ req })).resolves.toMatchObject({
        eventType: 'payment_paid',
        providerPaymentId: dataId,
        status: 'PAID',
        externalReference: 'local_payment_1',
      });

      restoreFetch();
    });

    test('rejects invalid signature when secret is set', async () => {
      const secret = 'mp_secret';
      const provider = buildProvider(MercadoPagoProvider, { credential: { apiKey: 'mp_key', webhookSecret: secret } });

      const restoreFetch = mockFetchOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({}),
      }));

      const req = {
        headers: { 'x-signature': 'ts=1700000000,v1=bad', 'x-request-id': 'req_1' },
        query: { 'data.id': '123', type: 'payment' },
        body: { data: { id: '123' } },
      };

      await expect(provider.handleWebhook({ req })).rejects.toMatchObject({ statusCode: 401 });

      restoreFetch();
    });
  });
});

