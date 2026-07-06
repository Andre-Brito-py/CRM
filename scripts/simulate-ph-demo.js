const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Setup ANSI console colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

async function main() {
  console.log(`\n${colors.bold}${colors.magenta}🎬 VYSIFY - PRODUCT HUNT DEMO SIMULATOR (OPTION A)${colors.reset}\n`);

  const workspaceSlug = 'acme-corp-premium';
  
  // 1. Get Workspace
  const workspace = await prisma.workspace.findFirst({
    where: { slug: workspaceSlug },
  });

  if (!workspace) {
    console.log(`${colors.red}❌ Erro: Workspace '${workspaceSlug}' não encontrado. Verifique se o seed:premium foi rodado.${colors.reset}`);
    process.exit(1);
  }

  // 2. Set highly optimized context for the demo
  const phContext = `A Vysify é um CRM avançado focado em B2B com WhatsApp Omnichannel e Inteligência Artificial. Nosso diferencial é que a IA responde os leads automaticamente com base no funil de vendas. Temos planos a partir de $39/mês. Integrações com Meta Ads, Zapier e Webhooks disponíveis. Diga que adoraria mostrar como funciona na prática.`;
  
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { aiContext: phContext }
  });

  // 3. Find a conversation to use
  const conversation = await prisma.conversation.findFirst({
    where: { workspaceId: workspace.id, platform: 'WHATSAPP' },
    include: { contact: true },
    orderBy: { updatedAt: 'desc' }
  });

  if (!conversation) {
    console.log(`${colors.red}❌ Erro: Nenhuma conversa de WhatsApp encontrada.${colors.reset}`);
    process.exit(1);
  }

  // Enable autopilot
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { autopilotEnabled: true }
  });

  console.log(`${colors.green}✅ Preparação concluída. Conversa selecionada: ${conversation.contact?.name || 'Cliente'}${colors.reset}\n`);
  
  console.log(`${colors.bold}${colors.yellow}⚠️ ATENÇÃO: A simulação vai começar em 5 segundos!${colors.reset}`);
  console.log(`${colors.cyan}👉 Mude para a tela do navegador (na página do Inbox) e comece a gravar!${colors.reset}\n`);
  
  // Countdown
  for (let i = 5; i > 0; i--) {
    console.log(`⏳ ${i}...`);
    await sleep(1000);
  }
  
  console.log(`\n🚀 INJETANDO MENSAGEM DO CLIENTE...`);

  // 4. Create Mock Inbound Message
  const inboundText = 'Hey team! We are looking for a CRM that can handle our WhatsApp leads automatically using AI. Does Vysify do this?';
  
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content: inboundText,
      direction: 'INBOUND',
      type: 'TEXT',
      status: 'DELIVERED',
      externalId: `ph-inbound-${Date.now()}`,
    }
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() }
  });

  console.log(`${colors.green}✅ Mensagem do cliente recebida! (Aguardando 3 segundos para simular leitura...)${colors.reset}`);
  await sleep(3000);

  // 5. Trigger AI
  console.log(`🤖 Solicitando resposta da IA...`);
  
  const systemPrompt = `Você é o assistente virtual da empresa "${workspace.name}", atendendo via WhatsApp.
Contexto: ${phContext}
Regras OBRIGATÓRIAS:
- Responda em Inglês (pois o cliente perguntou em Inglês).
- Resposta curta, empolgante, ideal para um vídeo de Product Hunt.
- Confirme que o Vysify faz exatamente isso e cite o preço inicial.
- Seja caloroso!`;

  let googleKey = process.env.GOOGLE_AI_API_KEY || 'AIzaSyBNZzYzNdnGlFwpId7HcPbCv_IQpUQ7WhY';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleKey}`;
  
  const requestBody = {
    contents: [
      { role: 'user', parts: [{ text: inboundText }] }
    ],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
  };

  let aiReplyText = '';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    aiReplyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!aiReplyText) {
        throw new Error("No text returned from AI");
    }
  } catch (err) {
    console.log(`${colors.red}❌ Falha na API. Usando resposta fallback perfeita para o vídeo.${colors.reset}`);
    aiReplyText = "Absolutely! 🚀 Vysify was built exactly for this. Our AI automatically qualifies your WhatsApp leads right inside the CRM. Plans start at just $39/mo! Would you like a quick tour?";
  }

  const finalReplyText = `🤖 ${aiReplyText.trim()}`;

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content: finalReplyText,
      direction: 'OUTBOUND',
      type: 'TEXT',
      status: 'SENT',
      externalId: `ph-outbound-${Date.now()}`,
    }
  });
  
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() }
  });

  console.log(`\n${colors.cyan}💬 Resposta da IA inserida com sucesso:${colors.reset}`);
  console.log(`   "${colors.bold}${aiReplyText.trim()}${colors.reset}"`);
  console.log(`\n${colors.bold}${colors.green}🎬 CORTE! A cena do Inbox foi finalizada com sucesso!${colors.reset}`);

  await prisma.$disconnect();
}

main();
