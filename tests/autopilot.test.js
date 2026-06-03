import prisma from '@/prisma/index';
import { processAutopilotReply } from '@/lib/server/autopilot';
import { sendWhatsAppMessage } from '@/lib/server/whatsapp';

// Mock sendWhatsAppMessage to prevent calling the Meta API
jest.mock('@/lib/server/whatsapp', () => ({
  sendWhatsAppMessage: jest.fn().mockResolvedValue('msg_fake_wamid_123456789'),
}));

// Mock generateChatCompletion to simulate AI response and capture system prompt
jest.mock('@/lib/server/ai/index', () => ({
  generateChatCompletion: jest.fn().mockImplementation(async ({ messages, systemPrompt }) => {
    global.capturedSystemPrompt = systemPrompt;
    return {
      content: "Claro Rodrigo! Nós temos a Cafeteira Inteligente Express por R$ 1.299,90 no link http://localhost:3000/p/acme-corp-premium/cafeteira-inteligente e também a Cadeira Ergonômica Premium por R$ 1.899,00 no link http://localhost:3000/p/acme-corp-premium/cadeira-ergonomica. Como posso te ajudar a adquirir?",
      usage: { total_tokens: 150, prompt_tokens: 100, completion_tokens: 50 },
      provider: 'openai',
      model: 'gpt-4o-mini'
    };
  }),
}));

describe('Autopilot AI Product Link Dispatch Test', () => {
  let workspace;
  let conversation;
  let contact;

  beforeAll(async () => {
    // 1. Fetch the seeded workspace, contact, and conversation
    workspace = await prisma.workspace.findFirst({
      where: { slug: 'acme-corp-premium' }
    });
    if (!workspace) throw new Error('Workspace acme-corp-premium not found. Run seed first.');

    contact = await prisma.contact.findFirst({
      where: { workspaceId: workspace.id, phone: '5521977776666' }
    });
    if (!contact) throw new Error('Contact Rodrigo Alves not found.');

    conversation = await prisma.conversation.findFirst({
      where: { contactId: contact.id, workspaceId: workspace.id }
    });
    if (!conversation) throw new Error('Conversation for Rodrigo Alves not found.');

    // Ensure autopilot is enabled for this conversation
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { autopilotEnabled: true }
    });
  });

  test('Autopilot responds automatically with product catalog and links when requested', async () => {
    // 2. Insert an inbound message simulating a customer requesting products
    const inboundMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        type: 'TEXT',
        content: 'Olá! Gostaria de saber quais produtos vocês têm à venda. Vocês têm alguma cadeira ergonômica ou cafeteira inteligente?',
        status: 'RECEIVED'
      }
    });

    console.log('User prompt inserted:', inboundMessage.content);

    // 3. Call autopilot processor
    await processAutopilotReply({
      workspace,
      conversation,
      contact,
      message: inboundMessage
    });

    // 4. Retrieve the latest outbound message created by autopilot
    const latestMessage = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        type: 'TEXT'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('--- System Prompt Passed to AI ---');
    console.log(global.capturedSystemPrompt);
    console.log('----------------------------------');

    console.log('--- Autopilot AI Reply ---');
    console.log(latestMessage ? latestMessage.content : 'No message generated');
    console.log('--------------------------');

    // 5. Verify the AI results
    expect(latestMessage).toBeDefined();
    expect(global.capturedSystemPrompt).toContain('Cafeteira Inteligente Express');
    expect(global.capturedSystemPrompt).toContain('Cadeira Ergonômica Premium');
    expect(global.capturedSystemPrompt).toContain('Fone de Ouvido Noise-Canceling');
    expect(latestMessage.content).toContain('🤖'); // Autopilot prefix
    
    // Check if the AI recommended the requested products
    const contentLower = latestMessage.content.toLowerCase();
    expect(contentLower).toContain('cadeira');
    expect(contentLower).toContain('cafeteira');
    
    // Check if links are included
    expect(contentLower).toContain('cadeira-ergonomica');
    expect(contentLower).toContain('cafeteira-inteligente');
    
    // Check if mocked WhatsApp send was called
    expect(sendWhatsAppMessage).toHaveBeenCalled();
  }, 30000); // 30 seconds timeout to allow AI API response
});
