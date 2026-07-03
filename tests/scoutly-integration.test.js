import handler from '../src/pages/api/integrations/scoutly/webhook';
import prisma from '../prisma/index';
import { verifyApiKey } from '../prisma/services/api-key';
import { isModuleAllowed } from '../src/lib/server/subscription';
import { processAutomation } from '../prisma/services/automation';

jest.mock('../prisma/index', () => ({
  __esModule: true,
  default: {
    company: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    pipeline: {
      findFirst: jest.fn(),
    },
    deal: {
      create: jest.fn(),
    },
    conversation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../prisma/services/api-key', () => ({
  verifyApiKey: jest.fn(),
}));

jest.mock('../src/lib/server/subscription', () => ({
  isModuleAllowed: jest.fn(),
}));

jest.mock('../prisma/services/automation', () => ({
  processAutomation: jest.fn(),
}));

describe('Scoutly SDR Autonomous Integration Webhook', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer nk_testkey123',
      },
      query: {},
      body: {
        source: 'scoutly',
        event: 'meeting_booked',
        preferredChannel: 'whatsapp',
        lead: {
          companyName: 'Acme Corp',
          email: 'contact@acme.com',
          phone: '+15550199',
          score: 95,
          scoreReason: 'Highly interested',
          contactName: 'John Doe',
          personalizedMessage: 'John is looking for a CRM solution.',
        },
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
  });

  test('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  test('should return 401 if API key is missing', async () => {
    req.headers = {};
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED_MISSING_API_KEY' });
  });

  test('should return 401 if API key is invalid', async () => {
    verifyApiKey.mockResolvedValue(null);
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED_INVALID_API_KEY' });
  });

  test('should return 403 if scoutly_integration module is disabled on the plan', async () => {
    verifyApiKey.mockResolvedValue({ workspaceId: 'ws_123' });
    isModuleAllowed.mockResolvedValue(false);
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'SCOUTLY_INTEGRATION_MODULE_DISABLED' });
  });

  test('should return 400 if payload structure is invalid', async () => {
    verifyApiKey.mockResolvedValue({ workspaceId: 'ws_123' });
    isModuleAllowed.mockResolvedValue(true);
    req.body = { source: 'invalid' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'INVALID_PAYLOAD_STRUCTURE' });
  });

  test('should successfully ingest lead and trigger autopilot and automations', async () => {
    verifyApiKey.mockResolvedValue({ workspaceId: 'ws_123' });
    isModuleAllowed.mockResolvedValue(true);

    // Mock company database responses
    prisma.company.findFirst.mockResolvedValue(null);
    prisma.company.create.mockResolvedValue({ id: 'comp_abc', name: 'Acme Corp' });

    // Mock contact database responses (new contact)
    prisma.contact.findFirst.mockResolvedValue(null);
    prisma.contact.create.mockResolvedValue({ id: 'contact_xyz', name: 'John Doe', email: 'contact@acme.com', phone: '+15550199' });

    // Mock pipeline configuration
    prisma.pipeline.findFirst.mockResolvedValue({
      id: 'pipe_123',
      stages: [{ id: 'stage_first', name: 'Lead In', order: 1 }],
    });

    // Mock deal creation
    prisma.deal.create.mockResolvedValue({ id: 'deal_789', name: 'John Doe - Acme Corp' });

    // Mock conversation creation
    prisma.conversation.findFirst.mockResolvedValue(null);
    prisma.conversation.create.mockResolvedValue({ id: 'conv_555', platform: 'WHATSAPP' });
    prisma.message.create.mockResolvedValue({ id: 'msg_001', content: 'John is looking for a CRM solution.' });

    await handler(req, res);

    // Verify company, contact, deal and conversation logic were executed
    expect(prisma.company.create).toHaveBeenCalledWith({
      data: { name: 'Acme Corp', workspaceId: 'ws_123' },
    });
    expect(prisma.contact.create).toHaveBeenCalled();
    expect(prisma.deal.create).toHaveBeenCalled();
    expect(prisma.conversation.create).toHaveBeenCalled();
    expect(prisma.message.create).toHaveBeenCalled();

    // Verify automations were called
    expect(processAutomation).toHaveBeenCalledWith('ws_123', 'DEAL_CREATED', expect.any(Object));
    expect(processAutomation).toHaveBeenCalledWith('ws_123', 'INCOMING_MESSAGE', expect.any(Object));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      leadId: 'contact_xyz',
      dealId: 'deal_789',
      conversationId: 'conv_555',
    });
  });
});
