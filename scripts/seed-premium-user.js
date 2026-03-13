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
  let workspace = await prisma.workspace.findFirst({ where: { slug: workspaceSlug } });
  
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Acme Corp (Enterprise)',
        slug: workspaceSlug,
        creatorId: user.id,
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
  
  const dealNames = [
    { n: 'Projeto Oracle Migration', amt: 45000, c: 'John Doe', stage: stages[4].id }, // Ganho
    { n: 'Licença Anual TechCorp', amt: 12500, c: 'Maria Silva', stage: stages[3].id }, // Proposta
    { n: 'Consultoria UX/UI Banco', amt: 89000, c: 'Carlos Ruiz', stage: stages[2].id }, // Reunião
    { n: 'Plano Enterprise CRM', amt: 3500, c: 'Anna Souza', stage: stages[4].id }, // Ganho
    { n: 'Setup Infra AWS', amt: 62000, c: 'Robert King', stage: stages[1].id }, // Qualificado
    { n: 'Mentoria Executiva', amt: 5000, c: 'Lucia Ferraz', stage: stages[4].id } // Ganho
  ];

  for (const d of dealNames) {
    const contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: d.c,
        email: `${d.c.replace(' ', '').toLowerCase()}@exemplo.com`,
        phone: '+5511999999999',
      }
    });

    await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        contactId: contact.id,
        stageId: d.stage,
        name: d.n,
        amount: d.amt,
        priority: d.amt > 20000 ? 'HIGH' : 'MEDIUM',
        assigneeId: user.id
      }
    });
  }
  console.log(`✅ ${dealNames.length} Negócios importados pro Dashboard.`);

  // 3. Criar Conversões Simuladas (WhatsApp)
  const contacts = await prisma.contact.findMany({ where: { workspaceId: workspace.id } });
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

  // 4. Rate Limits Fake (Para simular gráficos de consumo de IA e API)
  await prisma.rateLimitCounter.create({
    data: {
      key: `w:${workspace.id}:ai:summarize:day`,
      count: 450,
      resetAt: new Date(Date.now() + 86400000)
    }
  });

  console.log('🎉 Dados Premium gerados com sucesso!');
  console.log(`➡️ Email: ${userEmail}`);
  console.log(`➡️ Senha: SenhaForte123!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
