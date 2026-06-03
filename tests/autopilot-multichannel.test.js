/**
 * tests/autopilot-multichannel.test.js
 *
 * Testa o autopilot da IA em 3 canais diferentes com clientes reais do banco:
 *  1. WhatsApp  – Mariana Souza  → pergunta sobre cadeira ergonômica
 *  2. Email     – Thiago Rocha   → pergunta sobre frete e fones de ouvido
 *  3. Instagram – Fernanda Lima  → pedido de informação sobre cafeteira
 *
 * sendWhatsApp / sendMail / sendInstagram são mockados.
 * generateChatCompletion é mockado por canal (captura o system prompt real).
 */

import prisma from '@/prisma/index';
import { processAutopilotReply } from '@/lib/server/autopilot';

// ── Mock: WhatsApp ──────────────────────────────────────────────────
jest.mock('@/lib/server/whatsapp', () => ({
  sendWhatsAppMessage: jest.fn().mockResolvedValue('wamid_mock_123'),
}));

// ── Mock: Email ─────────────────────────────────────────────────────
jest.mock('@/lib/server/mail', () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'email_mock_456' }),
}));

// ── Mock: Instagram ─────────────────────────────────────────────────
jest.mock('@/lib/server/instagram', () => ({
  sendInstagramMessage: jest.fn().mockResolvedValue('igmid_mock_789'),
}));

// ── Mock: AI (captura o system prompt e responde por canal) ─────────
const capturedPrompts = {};

jest.mock('@/lib/server/ai/index', () => ({
  generateChatCompletion: jest.fn().mockImplementation(async ({ messages, systemPrompt }) => {
    // Detecta o canal pelo conteúdo específico do system prompt gerado pelo autopilot.js
    let content;
    if (systemPrompt?.includes('respondendo automaticamente por EMAIL')) {
      capturedPrompts.email = systemPrompt;
      content =
        'Olá Thiago, tudo bem?\n\nSobre o frete: oferecemos Frete grátis em compras acima de R$ 500. Nosso Fone de Ouvido Noise-Canceling está por R$ 999,00 e já inclui frete grátis!\n\nLink para compra: http://localhost:3000/p/acme-corp-premium/fone-noise-canceling\n\nPrazo de entrega: 5 a 10 dias úteis. Qualquer dúvida, estou à disposição.\n\nAcme Corp';
    } else if (systemPrompt?.includes('Instagram')) {
      capturedPrompts.instagram = systemPrompt;
      content =
        'Oi Fernanda! Nossa Cafeteira Inteligente Express está por R$ 1.299,90 com touchscreen e controle pelo app. Aqui o link: http://localhost:3000/p/acme-corp-premium/cafeteira-inteligente — Parcelamos em até 12x! Posso te ajudar com mais alguma coisa?';
    } else {
      capturedPrompts.whatsapp = systemPrompt;
      content =
        'Oi Mariana! A Cadeira Ergonômica Premium está por R$ 1.899,00, com suporte lombar ajustável e estrutura em alumínio. Aqui o link: http://localhost:3000/p/acme-corp-premium/cadeira-ergonomica — Parcelamos em 12x e Frete grátis acima de R$ 500! 🙌';
    }
    return {
      content,
      usage: { total_tokens: 180, prompt_tokens: 130, completion_tokens: 50 },
      provider: 'openai',
      model: 'gpt-4o-mini',
    };
  }),
}));

// ── Helpers ─────────────────────────────────────────────────────────
const WORKSPACE_SLUG = 'acme-corp-premium';

async function ensureIntegration(workspaceId, provider) {
  return prisma.integration.upsert({
    where: { workspaceId_provider: { workspaceId, provider } },
    update: { enabled: true },
    create: { workspaceId, provider, name: `${provider} CI Test`, enabled: true, credentials: {} },
  });
}

async function enableAutopilot(conversationId) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { autopilotEnabled: true },
  });
}

async function getLastOutboundMessage(conversationId) {
  return prisma.message.findFirst({
    where: { conversationId, direction: 'OUTBOUND', type: 'TEXT' },
    orderBy: { createdAt: 'desc' },
  });
}

// ════════════════════════════════════════════════════════════════════
describe('Autopilot Multi-Channel Tests', () => {
  let workspace;

  beforeAll(async () => {
    workspace = await prisma.workspace.findFirst({ where: { slug: WORKSPACE_SLUG } });
    if (!workspace) throw new Error('Workspace acme-corp-premium não encontrado. Rode o seed primeiro.');

    // Garante integrações para todos os canais
    await ensureIntegration(workspace.id, 'WHATSAPP');
    await ensureIntegration(workspace.id, 'EMAIL');
    await ensureIntegration(workspace.id, 'INSTAGRAM');

    console.log(`\n🏢 Workspace: ${workspace.name}\n`);
  });

  beforeEach(() => {
    // Limpa os prompts capturados antes de cada teste
    Object.keys(capturedPrompts).forEach(k => delete capturedPrompts[k]);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ──────────────────────────────────────────────────────────────────
  // TESTE 1 — WhatsApp: Mariana Souza pergunta sobre cadeira
  // ──────────────────────────────────────────────────────────────────
  test('[WhatsApp] Mariana Souza pergunta sobre cadeira ergonômica', async () => {
    const contact = await prisma.contact.findFirst({
      where: { workspaceId: workspace.id, phone: '5511988887777' },
    });
    expect(contact).toBeDefined();

    let conversation = await prisma.conversation.findFirst({
      where: { contactId: contact.id, workspaceId: workspace.id, platform: 'WHATSAPP' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { workspaceId: workspace.id, contactId: contact.id, platform: 'WHATSAPP', status: 'OPEN' },
      });
    }
    conversation = await enableAutopilot(conversation.id);

    const inbound = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        type: 'TEXT',
        content: 'Oi! Queria saber o preço da cadeira ergonômica de vocês. Tem frete grátis?',
        status: 'RECEIVED',
      },
    });

    console.log(`\n📱 [WhatsApp] Mariana pergunta: "${inbound.content}"`);

    await processAutopilotReply({ workspace, conversation, contact, message: inbound });

    const reply = await getLastOutboundMessage(conversation.id);

    console.log(`🤖 [WhatsApp] Autopilot responde: "${reply?.content}"`);
    console.log('\n--- System Prompt (WhatsApp) ---');
    console.log(capturedPrompts.whatsapp);
    console.log('--------------------------------\n');

    // Verificações
    expect(reply).toBeDefined();
    expect(reply.content.toLowerCase()).toContain('cadeira');
    expect(reply.content).toContain('cadeira-ergonomica');
    expect(reply.content).not.toContain('🤖');

    // Verifica que o system prompt contém o catálogo de produtos
    expect(capturedPrompts.whatsapp).toContain('Cafeteira Inteligente Express');
    expect(capturedPrompts.whatsapp).toContain('Cadeira Ergonômica Premium');
    expect(capturedPrompts.whatsapp).toContain('Fone de Ouvido Noise-Canceling');

    // Verifica que o contexto do negócio foi incluído
    expect(capturedPrompts.whatsapp).toContain('Acme Corp');
    expect(capturedPrompts.whatsapp).toMatch(/frete gr[aá]tis/i);

    const { sendWhatsAppMessage } = require('@/lib/server/whatsapp');
    expect(sendWhatsAppMessage).toHaveBeenCalled();
  }, 30000);

  // ──────────────────────────────────────────────────────────────────
  // TESTE 2 — Email: Thiago Rocha pergunta sobre frete e headphones
  // ──────────────────────────────────────────────────────────────────
  test('[Email] Thiago Rocha pergunta sobre política de frete e fones', async () => {
    const contact = await prisma.contact.findFirst({
      where: { workspaceId: workspace.id, email: 'thiago@apexpartners.com' },
    });
    expect(contact).toBeDefined();

    let conversation = await prisma.conversation.findFirst({
      where: { contactId: contact.id, workspaceId: workspace.id, platform: 'EMAIL' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { workspaceId: workspace.id, contactId: contact.id, platform: 'EMAIL', status: 'OPEN' },
      });
    }
    conversation = await enableAutopilot(conversation.id);

    const inbound = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        type: 'TEXT',
        content: 'Bom dia! Gostaria de saber mais sobre os fones de ouvido e qual a política de frete de vocês.',
        status: 'RECEIVED',
      },
    });

    console.log(`\n📧 [Email] Thiago pergunta: "${inbound.content}"`);

    await processAutopilotReply({ workspace, conversation, contact, message: inbound });

    const reply = await getLastOutboundMessage(conversation.id);

    console.log(`🤖 [Email] Autopilot responde: "${reply?.content}"`);
    console.log('\n--- System Prompt (Email) ---');
    console.log(capturedPrompts.email);
    console.log('-----------------------------\n');

    // Verificações
    expect(reply).toBeDefined();
    expect(reply.content.toLowerCase()).toContain('fone');
    expect(reply.content).toContain('fone-noise-canceling');
    expect(reply.content).not.toContain('🤖');

    // O system prompt de email deve ter regras específicas de email
    expect(capturedPrompts.email).toContain('EMAIL');
    expect(capturedPrompts.email).toContain('Acme Corp');
    expect(capturedPrompts.email).toMatch(/frete gr[aá]tis/i);

    const { sendMail } = require('@/lib/server/mail');
    expect(sendMail).toHaveBeenCalled();
  }, 30000);

  // ──────────────────────────────────────────────────────────────────
  // TESTE 3 — Instagram: Fernanda Lima pede info sobre cafeteira
  // ──────────────────────────────────────────────────────────────────
  test('[Instagram] Fernanda Lima quer saber sobre a cafeteira inteligente', async () => {
    const contact = await prisma.contact.findFirst({
      where: { workspaceId: workspace.id, email: 'fernanda.lima@horizonsolar.com.br' },
    });
    expect(contact).toBeDefined();

    // Cria ou busca conversa Instagram (com externalId para simular IG user ID)
    let conversation = await prisma.conversation.findFirst({
      where: { contactId: contact.id, workspaceId: workspace.id, platform: 'INSTAGRAM' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId: workspace.id,
          contactId: contact.id,
          platform: 'INSTAGRAM',
          status: 'OPEN',
          externalId: 'ig_user_fernanda_lima_123',
        },
      });
    }
    conversation = await enableAutopilot(conversation.id);

    const inbound = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        type: 'TEXT',
        content: 'Oi! Vi o post de vocês e fiquei interessada na cafeteira inteligente. Qual o preço? Tem parcelamento?',
        status: 'RECEIVED',
      },
    });

    console.log(`\n📸 [Instagram] Fernanda pergunta: "${inbound.content}"`);

    await processAutopilotReply({ workspace, conversation, contact, message: inbound });

    const reply = await getLastOutboundMessage(conversation.id);

    console.log(`🤖 [Instagram] Autopilot responde: "${reply?.content}"`);
    console.log('\n--- System Prompt (Instagram) ---');
    console.log(capturedPrompts.instagram);
    console.log('---------------------------------\n');

    // Verificações
    expect(reply).toBeDefined();
    expect(reply.content.toLowerCase()).toContain('cafeteira');
    expect(reply.content).toContain('cafeteira-inteligente');
    expect(reply.content).not.toContain('🤖');

    // Verifica que o system prompt menciona Instagram
    expect(capturedPrompts.instagram).toBeDefined();
    expect(capturedPrompts.instagram).toContain('Instagram');
    expect(capturedPrompts.instagram).toContain('Acme Corp');
    expect(capturedPrompts.instagram).toMatch(/parcelamos/i);

    const { sendInstagramMessage } = require('@/lib/server/instagram');
    expect(sendInstagramMessage).toHaveBeenCalled();
  }, 30000);
});
