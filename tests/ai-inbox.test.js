jest.mock('@/config/api-validation/index', () => ({
  validateSession: jest.fn(),
}));

jest.mock('@/prisma/services/workspace', () => ({
  getWorkspace: jest.fn(),
}));

jest.mock('@/prisma/services/conversation', () => ({
  getConversation: jest.fn(),
}));

jest.mock('@/lib/server/rateLimit', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/server/subscription', () => ({
  getWorkspaceLimits: jest.fn(),
  isModuleAllowed: jest.fn(),
  consumeExtraAiTokens: jest.fn().mockResolvedValue(0),
}));

jest.mock('@/lib/server/config', () => ({
  getSystemConfig: jest.fn(),
}));

jest.mock('@/lib/server/stripe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/prisma/index', () => ({
  __esModule: true,
  default: {
    conversation: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { validateSession } from '@/config/api-validation/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { getConversation } from '@/prisma/services/conversation';
import { rateLimit } from '@/lib/server/rateLimit';
import { getWorkspaceLimits, isModuleAllowed } from '@/lib/server/subscription';
import { getSystemConfig } from '@/lib/server/config';
import getStripe from '@/lib/server/stripe';
import prisma from '@/prisma/index';

import suggestReplyHandler from '@/pages/api/workspace/[workspaceSlug]/inbox/[conversationId]/suggest-reply';
import summarizeHandler from '@/pages/api/workspace/[workspaceSlug]/inbox/[conversationId]/summarize';

const createReqRes = ({ method = 'POST', query = {}, headers = {}, body = {} } = {}) => {
  const req = { method, query, headers, body };
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
  };
  return { req, res };
};

describe('AI Inbox endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rateLimit.mockResolvedValue({ ok: true, remaining: 10, resetAt: new Date().toISOString() });
    getWorkspaceLimits.mockResolvedValue({ aiRequests24h: 15 });
    isModuleAllowed.mockResolvedValue(true);
    validateSession.mockResolvedValue({
      user: { id: 'u_1', userId: 'u_1', email: 'agent@example.com', name: 'Agente' },
    });
    getWorkspace.mockResolvedValue({ id: 'w_1', name: 'Acme', slug: 'acme', creatorId: 'u_creator' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = undefined;
  });

  test('suggest-reply returns fallback suggestion when API key is missing', async () => {
    getSystemConfig.mockResolvedValue(null);
    getConversation.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'w_1',
      contact: { name: 'Maria' },
      messages: [
        { id: 'm_1', direction: 'INBOUND', content: 'Preciso de ajuda com meu pedido' },
        { id: 'm_2', direction: 'OUTBOUND', content: 'Claro! Vou verificar.' },
      ],
    });

    const { req, res } = createReqRes({
      query: { workspaceSlug: 'acme', conversationId: 'c_1' },
    });

    await suggestReplyHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.data?.provider).toBe('fallback');
    expect(String(res.body?.data?.suggestion || '')).toContain('Maria');
  });

  test('summarize returns provider summary when API key is set', async () => {
    const prevFetch = global.fetch;
    try {
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '• Ponto 1\n• Ponto 2\n• Próximo passo: ...' } }],
        }),
      }));

      // Ensure we use OpenAI for this test to match the fetch mock above
      getSystemConfig.mockImplementation(async (key) => {
        if (key === 'GOOGLE_AI_API_KEY') return null;
        if (key === 'OPENAI_API_KEY') return 'sk_test';
        return null;
      });

      prisma.conversation.findFirst.mockResolvedValue({
        id: 'c_2',
        workspaceId: 'w_1',
        status: 'OPEN',
        contact: { name: 'João' },
        messages: [
          { id: 'm_1', direction: 'INBOUND', content: 'Oi, preciso de suporte', createdAt: new Date().toISOString() },
          { id: 'm_2', direction: 'OUTBOUND', content: 'Claro, como posso ajudar?', createdAt: new Date().toISOString() },
        ],
      });

      const { req, res } = createReqRes({
        query: { workspaceSlug: 'acme', conversationId: 'c_2' },
      });

      await summarizeHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.data?.summary).toContain('Ponto 1');
    } finally {
      global.fetch = prevFetch;
    }
  });

  test('suggest-reply bills overage into next invoice when opted-in', async () => {
    const prevFetch = global.fetch;
    try {
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Resposta sugerida' } }],
          usage: { total_tokens: 1000 },
        }),
      }));

      getSystemConfig.mockImplementation(async (key, fallback) => {
        if (key === 'GOOGLE_AI_API_KEY') return null;
        if (key === 'OPENAI_API_KEY') return 'sk_test';
        if (key === 'AI_QUOTA_WARN_PERCENT') return '80';
        if (key === 'AI_OVERAGE_ENABLED') return 'true';
        if (key === 'AI_OVERAGE_REQUIRE_OPTIN') return 'true';
        if (key === 'AI_OVERAGE_PRICE_PER_1M_TOKENS') return '4.00';
        if (key === 'AI_OVERAGE_MAX_TOKENS_24H') return '200000';
        return fallback ?? null;
      });

      getConversation.mockResolvedValue({
        id: 'c_3',
        workspaceId: 'w_1',
        contact: { name: 'Maria' },
        messages: [{ id: 'm_1', direction: 'INBOUND', content: 'Oi' }],
      });

      getWorkspaceLimits.mockResolvedValue({ aiRequests24h: 15, aiTokens24h: 10 });

      rateLimit.mockImplementation(async ({ key }) => {
        const k = String(key || '');
        const resetAt = new Date().toISOString();
        if (k.includes('ai:suggest-reply:5m')) return { ok: true, remaining: 5, resetAt };
        if (k.includes('ai:suggest-reply:day')) return { ok: true, remaining: 15, resetAt };
        if (k.includes('ai:tokens_overage:day')) return { ok: true, remaining: 199000, resetAt };
        if (k.includes('ai:tokens:day')) return { ok: false, remaining: 0, resetAt };
        return { ok: true, remaining: 1, resetAt };
      });

      prisma.user.findUnique.mockResolvedValue({
        id: 'u_creator',
        email: 'owner@example.com',
        customerPayment: {
          paymentId: 'cus_123',
          providerSubscriptionId: 'sub_123',
        },
      });

      const stripeInvoiceItemCreate = jest.fn(async () => ({}));
      const stripeSubscriptionRetrieve = jest.fn(async () => ({
        items: { data: [{ price: { currency: 'usd' } }] },
      }));
      getStripe.mockResolvedValue({
        invoiceItems: { create: stripeInvoiceItemCreate },
        subscriptions: { retrieve: stripeSubscriptionRetrieve },
      });

      const { req, res } = createReqRes({
        query: { workspaceSlug: 'acme', conversationId: 'c_3' },
        headers: { 'x-ai-overage': 'true', 'x-request-id': 'req_1' },
      });

      await suggestReplyHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.data?.suggestion).toBe('Resposta sugerida');
      expect(stripeInvoiceItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          subscription: 'sub_123',
          currency: 'usd',
          amount: 1,
          metadata: expect.objectContaining({
            workspaceId: 'w_1',
            workspaceSlug: 'acme',
            requestId: 'req_1',
            userId: 'u_1',
            tokens: '1000',
            pricePer1M: '4',
          }),
        })
      );
    } finally {
      global.fetch = prevFetch;
    }
  });
});
