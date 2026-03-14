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
}));

jest.mock('@/lib/server/config', () => ({
  getSystemConfig: jest.fn(),
}));

jest.mock('@/prisma/index', () => ({
  __esModule: true,
  default: {
    conversation: {
      findFirst: jest.fn(),
    },
  },
}));

import { validateSession } from '@/config/api-validation/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { getConversation } from '@/prisma/services/conversation';
import { rateLimit } from '@/lib/server/rateLimit';
import { getWorkspaceLimits } from '@/lib/server/subscription';
import { getSystemConfig } from '@/lib/server/config';
import prisma from '@/prisma/index';

import suggestReplyHandler from '@/pages/api/workspace/[workspaceSlug]/inbox/[conversationId]/suggest-reply';
import summarizeHandler from '@/pages/api/workspace/[workspaceSlug]/inbox/[conversationId]/summarize';

const createReqRes = ({ method = 'POST', query = {}, headers = {}, body = {} } = {}) => {
  const req = { method, query, headers, body };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return { req, res };
};

describe('AI Inbox endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rateLimit.mockResolvedValue({ ok: true });
    getWorkspaceLimits.mockResolvedValue({ aiRequests24h: 15 });
    validateSession.mockResolvedValue({
      user: { id: 'u_1', userId: 'u_1', email: 'agent@example.com', name: 'Agente' },
    });
    getWorkspace.mockResolvedValue({ id: 'w_1', name: 'Acme', slug: 'acme' });
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
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '• Ponto 1\n• Ponto 2\n• Próximo passo: ...' } }],
      }),
    }));

    getSystemConfig.mockResolvedValue('sk_test');
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

    global.fetch = prevFetch;
  });
});
