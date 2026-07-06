import prisma from '@/prisma/index';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  try {
    // Busca a última conversa de WhatsApp em todo o banco
    const conversation = await prisma.conversation.findFirst({
      where: { platform: 'WHATSAPP' },
      orderBy: { updatedAt: 'desc' },
      include: { workspace: true }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Nenhuma conversa de WhatsApp encontrada no banco de dados. Envie uma mensagem para o seu bot primeiro para criar uma conversa!' });
    }

    const workspace = conversation.workspace;

    const phContext = `A Vysify é um CRM avançado focado em B2B com WhatsApp Omnichannel e Inteligência Artificial. Nosso diferencial é que a IA responde os leads automaticamente com base no funil de vendas. Temos planos a partir de $39/mês. Integrações com Meta Ads, Zapier e Webhooks disponíveis. Diga que adoraria mostrar como funciona na prática.`;
    
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { aiContext: phContext }
    });

    // 1. Limpar as mensagens antigas da conversa
    await prisma.message.deleteMany({
      where: { conversationId: conversation.id }
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { autopilotEnabled: true }
    });

    // Retorna a resposta imediatamente para liberar o navegador da aba oculta
    res.status(200).json({ 
      success: true, 
      msg: 'Simulação iniciada! Volte para a aba do Inbox, as mensagens vão aparecer em 5 segundos...' 
    });

    // ---------------------------------------------------------
    // Roda em background no servidor (sem prender a requisição)
    // ---------------------------------------------------------
    (async () => {
      try {
        // Aguarda 4 segundos para dar tempo do usuário voltar para a aba e começar a gravar
        await sleep(4000);

        // MENSAGEM 1 (Cliente)
        const userMsg1 = 'Hey team! We need a CRM for our agency. Can Vysify handle our WhatsApp leads?';
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            content: userMsg1,
            direction: 'INBOUND',
            type: 'TEXT',
            status: 'DELIVERED',
            externalId: `ph-in1-${Date.now()}`,
          }
        });
        await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

        await sleep(2500); // IA "pensando"

        // IA RESPONDE 1
        const aiMsg1 = '🤖 Yes! Vysify is a complete Omnichannel CRM. We connect all your WhatsApp numbers into one shared inbox. What specific features are you looking for?';
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            content: aiMsg1,
            direction: 'OUTBOUND',
            type: 'TEXT',
            status: 'SENT',
            externalId: `ph-out1-${Date.now()}`,
          }
        });
        await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

        await sleep(3500); // Cliente "digitando"

        // MENSAGEM 2 (Cliente detalhando necessidades)
        const userMsg2 = 'We need an AI that actually books meetings and answers based on our context. Plus Kanban pipelines and Automations. Does it do all that?';
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            content: userMsg2,
            direction: 'INBOUND',
            type: 'TEXT',
            status: 'DELIVERED',
            externalId: `ph-in2-${Date.now()}`,
          }
        });
        await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

        await sleep(3000); // IA "pensando"

        // IA RESPONDE 2 (O grande Pitch)
        const aiMsg2 = '🤖 Absolutely! 🚀 Our AI acts like your best SDR—it learns your exact business context, qualifies leads, and books meetings automatically.\n\nCombined with our drag-and-drop Kanban and powerful Automations, it puts your sales on autopilot. Plans start at just $39/mo. Ready for a quick tour?';
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            content: aiMsg2,
            direction: 'OUTBOUND',
            type: 'TEXT',
            status: 'SENT',
            externalId: `ph-out2-${Date.now()}`,
          }
        });
        await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

        await sleep(3000); // Cliente "digitando"

        // MENSAGEM 3 (Cliente aceitando)
        const userMsg3 = 'That sounds exactly like what we need! Let\'s do the tour. When are you free?';
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            content: userMsg3,
            direction: 'INBOUND',
            type: 'TEXT',
            status: 'DELIVERED',
            externalId: `ph-in3-${Date.now()}`,
          }
        });
        await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

      } catch (e) {
        console.error('Erro na simulação em background:', e);
      }
    })();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao iniciar simulação' });
  }
}
