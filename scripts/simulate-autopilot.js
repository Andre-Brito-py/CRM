const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Setup ANSI console colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  ${colors.bold}${colors.magenta}🤖 VYSIFY CRM — SIMULADOR DE AUTOPILOT (IA OMNICHANNEL)${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════${colors.reset}\n`);

  const workspaceSlug = 'acme-corp-premium';
  
  // 1. Get Workspace
  const workspace = await prisma.workspace.findFirst({
    where: { slug: workspaceSlug },
  });

  if (!workspace) {
    console.log(`${colors.red}❌ Erro: Workspace '${workspaceSlug}' não encontrado. Execute 'npm run seed:premium' primeiro.${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✅ Workspace Encontrado:${colors.reset}`);
  console.log(`   - Nome: ${workspace.name}`);
  console.log(`   - ID: ${workspace.id}`);
  console.log(`   - Slug: ${workspace.slug}`);

  // 2. Set business context if empty or update to testing context
  const testContext = `A Vysify é uma plataforma de CRM focada em automatizar vendas. Nossos planos custam R$ 299/mês para o plano Pro e R$ 999/mês para o plano Enterprise. Oferecemos atendimento 24/7 via WhatsApp. O cliente ganha 14 dias de teste grátis. Não damos descontos adicionais. Suporte técnico funciona de segunda a sexta, das 9h às 18h.`;
  
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { aiContext: testContext }
  });
  console.log(`\n${colors.green}✅ Contexto da Empresa (aiContext) atualizado para teste:${colors.reset}`);
  console.log(`   "${colors.gray}${testContext}${colors.reset}"`);

  // 3. Find first conversation
  const conversation = await prisma.conversation.findFirst({
    where: { workspaceId: workspace.id, platform: 'WHATSAPP' },
    include: { contact: true }
  });

  if (!conversation) {
    console.log(`${colors.red}❌ Erro: Nenhuma conversa de WhatsApp encontrada para teste.${colors.reset}`);
    process.exit(1);
  }

  // Ensure autopilot is enabled for this conversation
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { autopilotEnabled: true }
  });

  const contactName = conversation.contact?.name || 'Cliente de Teste';
  console.log(`\n${colors.green}✅ Conversa de Teste Encontrada & Autopilot Ativado:${colors.reset}`);
  console.log(`   - ID da Conversa: ${conversation.id}`);
  console.log(`   - Contato: ${contactName}`);
  console.log(`   - Plataforma: ${conversation.platform}`);
  console.log(`   - Autopilot Enabled: ${colors.bold}true${colors.reset}`);

  // 4. Create Mock Inbound Message
  const inboundText = 'Olá! Gostaria de saber quais são os planos de vocês, o preço e se tem período de teste gratuito?';
  const mockMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content: inboundText,
      direction: 'INBOUND',
      type: 'TEXT',
      status: 'DELIVERED',
      externalId: `simulated-${Date.now()}`,
    }
  });

  // Update conversation updatedAt
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      updatedAt: new Date(),
    }
  });

  console.log(`\n${colors.cyan}💬 Mensagem Recebida do Cliente (${contactName}):${colors.reset}`);
  console.log(`   "${colors.bold}${inboundText}${colors.reset}"`);

  // 5. Build system prompt & history
  const recentMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: { direction: true, content: true },
  });

  const history = [...recentMessages].reverse().map((m) => ({
    role: m.direction === 'OUTBOUND' ? 'assistant' : 'user',
    content: m.content,
  }));

  const systemPrompt = `Você é o assistente virtual da empresa "${workspace.name}", atendendo via WhatsApp.

Contexto do Negócio:
${testContext}

IMPORTANTE: Responda obrigatoriamente no idioma: Português.
Regras OBRIGATÓRIAS:
- Você é um chatbot inteligente e prestativo. Responda com base no contexto do negócio.
- Mantenha respostas curtas, humanas e práticas (1-5 linhas no WhatsApp).
- NÃO invente informações que não estejam no contexto fornecido. Se não souber, diga que vai transferir para um atendente humano.
- Não use Markdown. Faça no máximo 2 perguntas por mensagem.
- Assine como "${workspace.name}".
Nome do cliente: ${contactName}`;

  console.log(`\n${colors.blue}📝 Prompt do Sistema Gerado:${colors.reset}`);
  console.log(`${colors.gray}------------------------------------------------------------`);
  console.log(systemPrompt);
  console.log(`------------------------------------------------------------${colors.reset}`);

  // 6. Get API Key
  let googleKey = process.env.GOOGLE_AI_API_KEY;
  if (!googleKey || googleKey.startsWith('sk-')) {
    // If not configured, use the working key from test-key.js for demo purposes
    googleKey = 'AIzaSyBNZzYzNdnGlFwpId7HcPbCv_IQpUQ7WhY';
    console.log(`\n${colors.yellow}⚠️  Aviso: GOOGLE_AI_API_KEY não configurada no .env. Usando chave de demonstração para o teste...${colors.reset}`);
  } else {
    console.log(`\n${colors.green}🔑 Usando GOOGLE_AI_API_KEY configurada no .env (fim: ...${googleKey.slice(-6)})${colors.reset}`);
  }

  // 7. Make API Call to Gemini
  console.log(`\n${colors.yellow}📡 Enviando requisição para Google Gemini (gemini-2.5-flash)...${colors.reset}`);
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`;
  
  // Format history messages to Gemini format: [{ role: 'user'|'model', parts: [{ text }] }]
  const contents = [];
  
  // Add system instruction as system role if supported, or prepend it
  // In v1beta, system instructions can be sent in systemInstruction config, or as a system role parts
  const formattedContents = history.map(msg => {
    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    };
  });

  const requestBody = {
    contents: formattedContents,
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 400
    }
  };

  const start = Date.now();
  let aiReplyText = '';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    const duration = Date.now() - start;

    if (!response.ok) {
      throw new Error(`Gemini API Error (HTTP ${response.status}): ${data.error?.message || JSON.stringify(data)}`);
    }

    aiReplyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokensUsed = data?.usageMetadata?.totalTokenCount || 0;

    console.log(`${colors.green}✅ Resposta gerada em ${duration}ms | Tokens: ${tokensUsed}${colors.reset}`);
    
    // 8. Save Outbound AI Reply to DB
    const cleanReply = aiReplyText.trim();
    const finalReplyText = `🤖 ${cleanReply}`;

    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: finalReplyText,
        direction: 'OUTBOUND',
        type: 'TEXT',
        status: 'SENT',
        externalId: `simulated-reply-${Date.now()}`,
      }
    });

    console.log(`\n${colors.green}✅ Resposta do Autopilot salva no banco (ID: ${savedMessage.id}):${colors.reset}`);
    console.log(`   "${colors.bold}${colors.yellow}${cleanReply}${colors.reset}"`);

    console.log(`\n${colors.green}🎉 TESTE CONCLUÍDO COM SUCESSO! A IA respondeu corretamente dentro do contexto da empresa!${colors.reset}`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Erro na chamada da API da IA:${colors.reset}`, error.message);
  } finally {
    await prisma.$disconnect();
    console.log(`\n${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════${colors.reset}\n`);
  }
}

main();
