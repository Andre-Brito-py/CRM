const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando geração de dados para Usuário Premium...');
  const userEmail = 'lucas_premium@example.com';
  const password = await bcrypt.hash('SenhaForte123!', 10);
  
  let user = await prisma.user.findUnique({ where: { email: userEmail } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Lucas Premium',
        email: userEmail,
        password: password,
        emailVerified: new Date(),
        role: 'USER',
      }
    });
    console.log(`✅ Usuário criado: ${user.email}`);
  } else {
    user = await prisma.user.update({
      where: { email: userEmail },
      data: { password, emailVerified: new Date() }
    });
    console.log(`✅ Usuário atualizado: ${user.email}`);
  }

  const workspaceSlug = 'acme-corp-premium';
  const workspaceAiContext = `A Acme Corp é uma loja especializada em tecnologia e conforto para o home office e o dia a dia. Vendemos produtos premium com entrega para todo o Brasil.

Nosso catálogo inclui:
- Cafeteiras inteligentes com touchscreen e controle por app, ideais para quem ama um bom café com praticidade.
- Cadeiras ergonômicas premium com suporte lombar ajustável, apoios de braço 3D e estrutura em alumínio, perfeitas para longas horas de trabalho.
- Fones de ouvido over-ear com cancelamento de ruído ativo, bateria de até 40h e áudio de alta fidelidade.

Política de vendas:
- Parcelamos em até 12x no cartão de crédito.
- Frete grátis para compras acima de R$ 500.
- Troca e devolução em até 30 dias.
- Não oferecemos descontos adicionais fora de promoções ativas.
- Prazo de entrega: 5 a 10 dias úteis.

Atendimento:
- Disponível de segunda a sexta, das 9h às 18h.
- Para dúvidas fora do horário, o assistente virtual pode ajudar com informações e envio de links de produtos.`;

  let workspace = await prisma.workspace.findFirst({ where: { slug: workspaceSlug } });
  
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Acme Corp (Enterprise)',
        slug: workspaceSlug,
        creatorId: user.id,
        aiContext: workspaceAiContext,
        members: {
          create: {
            email: user.email,
            inviter: user.email,
            status: 'ACCEPTED',
            teamRole: 'OWNER',
          }
        }
      }
    });
    console.log(`✅ Workspace criado: ${workspace.name}`);
  } else {
    // Keep aiContext in sync on re-runs
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { aiContext: workspaceAiContext },
    });
    console.log(`✅ Workspace encontrado e aiContext atualizado: ${workspace.name}`);
  }

  // 1. Criar Pipeline e Estágios
  let pipeline = await prisma.pipeline.findFirst({ where: { workspaceId: workspace.id } });
  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        workspaceId: workspace.id,
        name: 'Funil de Vendas SaaS',
        stages: {
          create: [
            { name: 'Lead Frio', order: 1, color: '#9ca3af' },
            { name: 'Qualificado pela IA', order: 2, color: '#3b82f6' },
            { name: 'Reunião Agendada', order: 3, color: '#f59e0b' },
            { name: 'Proposta Enviada', order: 4, color: '#8b5cf6' },
            { name: 'Fechado/Ganho', order: 5, color: '#10b981' },
          ]
        }
      },
      include: { stages: true }
    });
    console.log(`✅ Pipeline criado com ${pipeline.stages.length} estágios.`);
  }

  // 2. Criar Contatos e Negócios Fakes (Deals) para gráficos bonitos
  const stages = pipeline.stages || await prisma.stage.findMany({ where: { pipelineId: pipeline.id }, orderBy: { order: 'asc' } });
  
  const wonStageId = stages.find(s => s.name === 'Fechado/Ganho' || s.name === 'Won')?.id || stages[stages.length - 1].id;
  const proposalStageId = stages.find(s => s.name === 'Proposta Enviada')?.id || stages[3].id;
  const meetingStageId = stages.find(s => s.name === 'Reunião Agendada')?.id || stages[2].id;

  console.log('📈 Gerando histórico de 6 meses para o gráfico de receita...');
  
  const historicalDeals = [
    { name: 'Contrato Alpha', amount: 12500, monthsAgo: 5 },
    { name: 'Licença Beta', amount: 8000, monthsAgo: 5 },
    { name: 'Consultoria Gamma', amount: 15400, monthsAgo: 4 },
    { name: 'Setup Delta', amount: 9200, monthsAgo: 4 },
    { name: 'Retainer Epsilon', amount: 22000, monthsAgo: 3 },
    { name: 'Projeto Zeta', amount: 18500, monthsAgo: 2 },
    { name: 'Hardware Eta', amount: 31000, monthsAgo: 1 },
    { name: 'Software Theta', amount: 45000, monthsAgo: 0 },
    { name: 'Consulting Iota', amount: 12000, monthsAgo: 0 },
  ];

  for (const hd of historicalDeals) {
    const date = new Date();
    date.setMonth(date.getMonth() - hd.monthsAgo);
    
    const contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: `Cliente ${hd.name.split(' ')[1]}`,
        email: `${hd.name.toLowerCase().replace(' ', '_')}@democorp.com`,
        createdAt: date
      }
    });

    await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        contactId: contact.id,
        stageId: wonStageId,
        name: hd.name,
        amount: hd.amount,
        priority: hd.amount > 20000 ? 'HIGH' : 'MEDIUM',
        assigneeId: user.id,
        createdAt: date
      }
    });

    // Criar atividade para o feed
    await prisma.activity.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        dealId: (await prisma.deal.findFirst({ where: { name: hd.name }, select: { id: true } })).id,
        type: 'DEAL_CREATED',
        title: `Protocolo ${hd.name} finalizado com sucesso`,
        createdAt: date
      }
    });
  }

  // 3. Criar Pesquisa NPS e Respostas
  console.log('😊 Gerando dados de satisfação (NPS)...');
  let survey = await prisma.npsSurvey.findFirst({ where: { workspaceId: workspace.id } });
  if (!survey) {
    survey = await prisma.npsSurvey.create({
      data: {
        workspaceId: workspace.id,
        name: 'Pesquisa de Satisfação Q1',
        triggerType: 'manual'
      }
    });
  }

  const npsScores = [10, 10, 9, 9, 8, 8, 7, 6, 10, 9, 8, 10, 4, 10];
  for (const score of npsScores) {
    const contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: `Feedbacker ${Math.floor(Math.random() * 1000)}`,
        email: `feedback_${Math.random().toString(36).substring(7)}@test.com`,
      }
    });

    await prisma.npsResponse.create({
      data: {
        workspaceId: workspace.id,
        surveyId: survey.id,
        contactId: contact.id,
        score,
        classification: score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor',
        feedbackText: score > 8 ? 'Excelente serviço!' : score < 6 ? 'Pode melhorar a agilidade.' : 'Bom atendimento.'
      }
    });
  }

  // 4. Criar Conversões Simuladas (WhatsApp)
  const contacts = await prisma.contact.findMany({ where: { workspaceId: workspace.id }, take: 5 });
  for (const c of contacts) {
    const conv = await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        contactId: c.id,
        assigneeId: user.id,
        platform: 'WHATSAPP',
        status: 'OPEN',
      }
    });

    await prisma.message.createMany({
      data: [
        { conversationId: conv.id, direction: 'INBOUND', type: 'TEXT', content: 'Olá, gostaria de saber mais sobre o software.', status: 'RECEIVED' },
        { conversationId: conv.id, direction: 'OUTBOUND', type: 'TEXT', content: 'Claro! Como a IA pode te ajudar hoje?', status: 'READ' },
      ]
    });
  }
  console.log(`✅ Conversas do WhatsApp simuladas.`);

  // 5. Contato específico para o teste do Autopilot (Rodrigo Alves)
  console.log('🤖 Criando contato para teste do Autopilot...');
  let rodrigo = await prisma.contact.findFirst({
    where: { workspaceId: workspace.id, phone: '5521977776666' }
  });
  if (!rodrigo) {
    rodrigo = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: 'Rodrigo Alves',
        email: 'rodrigo.alves@example.com',
        phone: '5521977776666',
      }
    });
    console.log(`✅ Contato Rodrigo Alves criado.`);
  }

  const rodrigoConv = await prisma.conversation.findFirst({
    where: { contactId: rodrigo.id, workspaceId: workspace.id }
  });
  if (!rodrigoConv) {
    await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        contactId: rodrigo.id,
        assigneeId: user.id,
        platform: 'WHATSAPP',
        status: 'OPEN',
        autopilotEnabled: true,
      }
    });
    console.log(`✅ Conversa de Rodrigo Alves criada com autopilot ativo.`);
  }

  // 6. Rate Limits Fake (Para simular gráficos de consumo de IA e API)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.rateLimitCounter.upsert({
    where: { key: `w:${workspace.id}:ai:summarize:day` },
    update: { count: 342, resetAt: tomorrow },
    create: { key: `w:${workspace.id}:ai:summarize:day`, count: 342, resetAt: tomorrow }
  });

  await prisma.rateLimitCounter.upsert({
    where: { key: `w:${workspace.id}:upload:file:day` },
    update: { count: 85, resetAt: tomorrow },
    create: { key: `w:${workspace.id}:upload:file:day`, count: 85, resetAt: tomorrow }
  });

  console.log('🎉 Dados Premium gerados com sucesso!');
  console.log(`➡️ Email: ${userEmail}`);
  console.log(`➡️ Senha: SenhaForte123!`);
  console.log(`➡️ Workspace: ${workspaceSlug}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
