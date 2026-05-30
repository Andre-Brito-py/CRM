const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando geração de dados VISUAIS e RICOS para divulgação...');

  const workspaceSlug = 'acme-corp-premium';
  const ownerEmail = 'lucas_premium@example.com';

  // 1. Get owner user and workspace
  const ownerUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!ownerUser) {
    console.error('❌ Erro: Execute "npm run seed:premium" primeiro para criar o usuário base.');
    process.exit(1);
  }

  const workspace = await prisma.workspace.findFirst({ where: { slug: workspaceSlug } });
  if (!workspace) {
    console.error('❌ Erro: Workspace acme-corp-premium não encontrado.');
    process.exit(1);
  }

  console.log(`🏢 Workspace ativo: ${workspace.name} (ID: ${workspace.id})`);

  // 2. Limpar dados anteriores do workspace para evitar duplicidades e lixo visual
  console.log('🧹 Limpando dados de teste anteriores neste workspace...');
  const workspaceId = workspace.id;

  await prisma.activity.deleteMany({ where: { workspaceId } });
  await prisma.task.deleteMany({ where: { workspaceId } });
  await prisma.npsResponse.deleteMany({ where: { workspaceId } });
  await prisma.npsSurvey.deleteMany({ where: { workspaceId } });
  await prisma.payment.deleteMany({ where: { workspaceId } });
  await prisma.deal.deleteMany({ where: { workspaceId } });
  await prisma.message.deleteMany({ where: { conversation: { workspaceId } } });
  await prisma.conversation.deleteMany({ where: { workspaceId } });
  await prisma.contact.deleteMany({ where: { workspaceId } });
  await prisma.company.deleteMany({ where: { workspaceId } });
  await prisma.tag.deleteMany({ where: { workspaceId } });
  await prisma.member.deleteMany({ where: { workspaceId, NOT: { email: ownerEmail } } });
  await prisma.integration.deleteMany({ where: { workspaceId } });
  await prisma.paymentProduct.deleteMany({ where: { workspaceId } });
  await prisma.webForm.deleteMany({ where: { workspaceId } });

  console.log('✅ Banco limpo para o workspace!');

  // 3. Criar Tags Coloridas
  console.log('🏷️  Criando tags...');
  const tagsData = [
    { name: 'Lead Quente', color: '#ef4444' }, // Red
    { name: 'VIP ⭐', color: '#eab308' },      // Yellow
    { name: 'Interesse Pro', color: '#3b82f6' }, // Blue
    { name: 'SaaS', color: '#8b5cf6' },         // Purple
    { name: 'Parceiro', color: '#10b981' },     // Green
    { name: 'Ex-Cliente', color: '#6b7280' },   // Gray
  ];

  const tags = {};
  for (const tagInfo of tagsData) {
    const createdTag = await prisma.tag.create({
      data: {
        workspaceId,
        name: tagInfo.name,
        color: tagInfo.color,
      }
    });
    tags[tagInfo.name] = createdTag;
  }

  // 4. Criar Usuários Adicionais da Equipe (Membros)
  console.log('👥 Criando equipe do workspace (Membros)...');
  const teamMembersData = [
    { name: 'Amanda Costa', email: 'amanda@acme.com', role: 'MEMBER' },
    { name: 'Bruno Martins', email: 'bruno@acme.com', role: 'MEMBER' },
    { name: 'Carla Dias', email: 'carla@acme.com', role: 'MEMBER' },
  ];

  const team = [ownerUser]; // O dono já está na equipe
  const passwordHash = await bcrypt.hash('SenhaForte123!', 10);

  for (const memberInfo of teamMembersData) {
    let user = await prisma.user.findUnique({ where: { email: memberInfo.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: memberInfo.name,
          email: memberInfo.email,
          password: passwordHash,
          emailVerified: new Date(),
          role: 'USER',
        }
      });
    }

    await prisma.member.create({
      data: {
        workspaceId,
        email: user.email,
        inviter: ownerUser.email,
        status: 'ACCEPTED',
        teamRole: memberInfo.role,
        joinedAt: new Date(),
      }
    });
    team.push(user);
    console.log(`   - Membro adicionado: ${memberInfo.name} (${memberInfo.role})`);
  }

  // 5. Criar Empresas Realistas
  console.log('🏢 Criando empresas clientes...');
  const companiesData = [
    { name: 'Stark Tech', website: 'starktech.io', industry: 'Tecnologia' },
    { name: 'Krypton Digital Agency', website: 'krypton.agency', industry: 'Marketing' },
    { name: 'Horizon Solar Energy', website: 'horizonsolar.com.br', industry: 'Energia' },
    { name: 'Apex Partners Consulting', website: 'apexpartners.com', industry: 'Finanças' },
    { name: 'Nexus Health Care', website: 'nexushealth.com.br', industry: 'Saúde' },
    { name: 'Prime Empreendimentos', website: 'primeimoveis.com.br', industry: 'Imobiliário' },
  ];

  const companies = {};
  for (const cData of companiesData) {
    const createdCompany = await prisma.company.create({
      data: {
        workspaceId,
        name: cData.name,
        website: cData.website,
        industry: cData.industry,
        customFields: {
          tamanho: '50-100 funcionários',
          origem: 'Inbound'
        }
      }
    });
    companies[cData.name] = createdCompany;
  }

  // 6. Criar Contatos com Detalhes Ricos
  console.log('👤 Criando contatos com detalhes ricos...');
  const contactsData = [
    { name: 'Mariana Souza', email: 'mariana.souza@starktech.io', phone: '5511988887777', jobTitle: 'Diretora de TI', companyName: 'Stark Tech', tags: ['VIP ⭐', 'Lead Quente'] },
    { name: 'Rodrigo Alves', email: 'rodrigo@krypton.agency', phone: '5521977776666', jobTitle: 'CEO & Fundador', companyName: 'Krypton Digital Agency', tags: ['Interesse Pro'] },
    { name: 'Fernanda Lima', email: 'fernanda.lima@horizonsolar.com.br', phone: '5531988889999', jobTitle: 'Diretora Comercial', companyName: 'Horizon Solar Energy', tags: ['VIP ⭐', 'SaaS'] },
    { name: 'Thiago Rocha', email: 'thiago@apexpartners.com', phone: '5541999998888', jobTitle: 'Diretor Financeiro', companyName: 'Apex Partners Consulting', tags: ['Parceiro'] },
    { name: 'Camila Castro', email: 'camila.castro@nexushealth.com.br', phone: '5519966665555', jobTitle: 'Gestora de TI', companyName: 'Nexus Health Care', tags: ['Lead Quente', 'SaaS'] },
    { name: 'Gustavo Lima', email: 'gustavo@primeimoveis.com.br', phone: '5583988882222', jobTitle: 'Diretor de Expansão', companyName: 'Prime Empreendimentos', tags: ['VIP ⭐'] },
  ];

  const contacts = [];
  for (const cInfo of contactsData) {
    const contactTags = cInfo.tags.map(tName => ({ id: tags[tName].id }));
    const createdContact = await prisma.contact.create({
      data: {
        workspaceId,
        companyId: companies[cInfo.companyName].id,
        name: cInfo.name,
        email: cInfo.email,
        phone: cInfo.phone,
        jobTitle: cInfo.jobTitle,
        tags: {
          connect: contactTags
        },
        customFields: {
          linkedin: `linkedin.com/in/${cInfo.name.toLowerCase().replace(' ', '')}`,
          aniversario: '15/08'
        }
      },
      include: { tags: true }
    });
    contacts.push(createdContact);
    console.log(`   - Contato criado: ${cInfo.name} | ${cInfo.jobTitle} em ${cInfo.companyName}`);
  }

  // 7. Configurar Funil de Vendas (Pipeline) e Estágios
  let pipeline = await prisma.pipeline.findFirst({
    where: { workspaceId },
    include: { stages: true }
  });

  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        workspaceId,
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
  }

  const stages = pipeline.stages;
  console.log(`📊 Funil ativo: ${pipeline.name} com ${stages.length} estágios.`);

  // Mapear IDs de estágios
  const stageMap = {};
  stages.forEach(s => {
    stageMap[s.name] = s.id;
  });

  // 8. Criar Oportunidades (Deals) no Funil para ficar Visualmente Lindo
  console.log('📈 Criando oportunidades no funil (Deals)...');
  const dealsData = [
    { name: 'CRM Stark Tech', amount: 15400, stage: 'Qualificado pela IA', priority: 'HIGH', contactName: 'Mariana Souza', assigneeName: 'Amanda Costa' },
    { name: 'Licenças Pro Krypton', amount: 8900, stage: 'Qualificado pela IA', priority: 'MEDIUM', contactName: 'Rodrigo Alves', assigneeName: 'Bruno Martins' },
    { name: 'Expansão Prime Imóveis', amount: 28000, stage: 'Lead Frio', priority: 'LOW', contactName: 'Gustavo Lima', assigneeName: 'Carla Dias' },
    { name: 'SaaS Horizon Solar', amount: 24000, stage: 'Reunião Agendada', priority: 'HIGH', contactName: 'Fernanda Lima', assigneeName: 'Lucas Premium' },
    { name: 'Consultoria Apex Partners', amount: 12000, stage: 'Proposta Enviada', priority: 'MEDIUM', contactName: 'Thiago Rocha', assigneeName: 'Amanda Costa' },
    { name: 'Implantação Nexus Health', amount: 19800, stage: 'Proposta Enviada', priority: 'HIGH', contactName: 'Camila Castro', assigneeName: 'Bruno Martins' },
  ];

  const activeDeals = [];
  for (const dInfo of dealsData) {
    const contact = contacts.find(c => c.name === dInfo.contactName);
    const assignee = team.find(u => u.name === dInfo.assigneeName) || ownerUser;
    
    const createdDeal = await prisma.deal.create({
      data: {
        workspaceId,
        contactId: contact.id,
        companyId: contact.companyId,
        stageId: stageMap[dInfo.stage],
        name: dInfo.name,
        amount: dInfo.amount,
        priority: dInfo.priority,
        assigneeId: assignee.id,
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60_000), // expira em 30 dias
        customFields: {
          motivo: 'Automação de processos',
          concorrente: 'Salesforce'
        }
      }
    });
    activeDeals.push(createdDeal);
    console.log(`   - Deal criado: ${dInfo.name} (R$ ${dInfo.amount}) no estágio [${dInfo.stage}]`);
  }

  // 9. Gerar Histórico Financeiro dos últimos 6 meses (Fechado/Ganho) para Gráficos Incríveis
  console.log('💰 Gerando histórico de receita ganha para gráficos de faturamento...');
  const historicalDeals = [
    { name: 'Licença Enterprise Alpha', amount: 25000, monthsAgo: 5, assignee: team[0] },
    { name: 'Setup Inicial Beta Corp', amount: 8000, monthsAgo: 5, assignee: team[1] },
    { name: 'Consultoria Estruturada Gamma', amount: 15000, monthsAgo: 4, assignee: team[2] },
    { name: 'Plano Pro Delta Ltda', amount: 3588, monthsAgo: 4, assignee: team[0] },
    { name: 'Retainer Mensal Epsilon', amount: 22000, monthsAgo: 3, assignee: team[1] },
    { name: 'Projeto IoT Solar Zeta', amount: 18500, monthsAgo: 2, assignee: team[2] },
    { name: 'Licenças Anuais Stark Tech', amount: 31000, monthsAgo: 1, assignee: team[0] },
    { name: 'SaaS Enterprise Prime V1', amount: 45000, monthsAgo: 0, assignee: team[1] },
    { name: 'Consultoria Integrada Iota', amount: 12000, monthsAgo: 0, assignee: team[2] },
    { name: 'Implantação Global Sigma', amount: 35000, monthsAgo: 0, assignee: team[0] },
  ];

  for (const hd of historicalDeals) {
    const date = new Date();
    date.setMonth(date.getMonth() - hd.monthsAgo);
    // Adiciona uma dispersão de dias no mês
    date.setDate(Math.floor(Math.random() * 25) + 1);

    const histContact = await prisma.contact.create({
      data: {
        workspaceId,
        name: `Cliente Ganho ${hd.name.split(' ').slice(-1)[0]}`,
        email: `contato_${hd.name.toLowerCase().replace(/ /g, '_')}@democorp.com`,
      }
    });

    const deal = await prisma.deal.create({
      data: {
        workspaceId,
        contactId: histContact.id,
        stageId: stageMap['Fechado/Ganho'],
        name: hd.name,
        amount: hd.amount,
        priority: hd.amount > 20000 ? 'HIGH' : 'MEDIUM',
        assigneeId: hd.assignee.id,
        createdAt: date,
        closeDate: date,
      }
    });

    // Criar pagamento correspondente concluído (para gerar relatórios financeiros)
    await prisma.payment.create({
      data: {
        workspaceId,
        contactId: histContact.id,
        dealId: deal.id,
        amount: hd.amount,
        value: hd.amount,
        platformFee: hd.amount * 0.02, // 2% de taxa
        netAmount: hd.amount * 0.98,
        description: `Faturamento - ${hd.name}`,
        status: 'PAID',
        billingType: 'CREDIT_CARD',
        dueDate: date,
        createdAt: date,
        updatedAt: date
      }
    });

    // Criar atividade de sucesso no feed
    await prisma.activity.create({
      data: {
        workspaceId,
        userId: hd.assignee.id,
        contactId: histContact.id,
        dealId: deal.id,
        type: 'DEAL_UPDATED',
        title: `Venda concluída! ${hd.name}`,
        content: `O negócio foi fechado com sucesso por ${hd.assignee.name} no valor de R$ ${hd.amount.toLocaleString('pt-BR')}`,
        createdAt: date
      }
    });
  }
  console.log('✅ Histórico financeiro e pagamentos criados com sucesso!');

  // 10. Criar Tarefas Pendentes e Concluídas
  console.log('📅 Criando tarefas...');
  const tasksData = [
    { title: 'Apresentar Demo Completa do CRM', content: 'Focar na automação de IA e nos relatórios financeiros customizados.', daysFromNow: 2, priority: 'HIGH', contactName: 'Mariana Souza', assigneeName: 'Amanda Costa', isCompleted: false },
    { title: 'Ligar para Qualificar Lead', content: 'Descobrir se possuem equipe de vendas interna e se usam WhatsApp.', daysFromNow: 0, priority: 'MEDIUM', contactName: 'Rodrigo Alves', assigneeName: 'Bruno Martins', isCompleted: false },
    { title: 'Enviar Proposta Comercial em PDF', content: 'Proposta de R$ 24k/mês. Enviar com urgência pois o cliente cobrou.', daysFromNow: -1, priority: 'HIGH', contactName: 'Fernanda Lima', assigneeName: 'Lucas Premium', isCompleted: false }, // Em atraso
    { title: 'Reunião de Fechamento de Escopo', content: 'Definir datas de implantação e entrega de chaves de API.', daysFromNow: 5, priority: 'HIGH', contactName: 'Camila Castro', assigneeName: 'Bruno Martins', isCompleted: false },
    { title: 'Cadastrar chaves de webhook de produção', content: 'Chaves cadastradas na Meta Developer e integradas no Vysify.', daysFromNow: -3, priority: 'LOW', contactName: 'Gustavo Lima', assigneeName: 'Carla Dias', isCompleted: true },
  ];

  for (const tInfo of tasksData) {
    const contact = contacts.find(c => c.name === tInfo.contactName);
    const assignee = team.find(u => u.name === tInfo.assigneeName) || ownerUser;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + tInfo.daysFromNow);

    await prisma.task.create({
      data: {
        workspaceId,
        title: tInfo.title,
        content: tInfo.content,
        priority: tInfo.priority,
        isCompleted: tInfo.isCompleted,
        dueDate: tInfo.isCompleted ? null : dueDate,
        contactId: contact.id,
        assigneeId: assignee.id,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60_000)
      }
    });
  }

  // 11. Criar Integrações Ativas Mockadas
  console.log('🔌 Ativando conexões de integrações...');
  const integrationsData = [
    { provider: 'WHATSAPP', name: 'WhatsApp Business API Cloud', credentials: { phone_number_id: '108250537827626', business_account_id: 'act_9883492' } },
    { provider: 'EMAIL', name: 'Email SMTP Comercial', credentials: { host: 'smtp.gmail.com', port: 465, user: 'vendas@acme.com' } },
    { provider: 'STRIPE', name: 'Gateway Stripe Brasil', credentials: { account_id: 'acct_1234567890' } },
    { provider: 'ASAAS', name: 'Gateway Asaas Financeiro', credentials: { api_key: '$2y$10$abcdefghijklmn' } },
  ];

  for (const intData of integrationsData) {
    await prisma.integration.create({
      data: {
        workspaceId,
        provider: intData.provider,
        name: intData.name,
        enabled: true,
        credentials: intData.credentials
      }
    });
  }

  // 12. Criar Conversas Omnichannel Ricas
  console.log('💬 Criando conversas ativas no inbox (Omnichannel)...');
  
  // Conversa 1: WhatsApp Mariana Souza (Stark Tech) - Comercial Ativo
  const convMariana = await prisma.conversation.create({
    data: {
      workspaceId,
      contactId: contacts.find(c => c.name === 'Mariana Souza').id,
      assigneeId: team.find(u => u.name === 'Amanda Costa').id,
      platform: 'WHATSAPP',
      status: 'OPEN',
      updatedAt: new Date(),
    }
  });

  await prisma.message.createMany({
    data: [
      { conversationId: convMariana.id, direction: 'INBOUND', type: 'TEXT', content: 'Olá! Vi o sistema de vocês e gostaria de uma demonstração focada em integração com nossa telefonia.', status: 'READ', createdAt: new Date(Date.now() - 3 * 60 * 60_000) },
      { conversationId: convMariana.id, direction: 'OUTBOUND', type: 'TEXT', content: 'Olá Mariana, boa tarde! Claro, consigo te mostrar isso sim. O nosso CRM possui webhooks e APIs abertas que resolvem isso em minutos. Qual seu melhor horário amanhã?', status: 'READ', createdAt: new Date(Date.now() - 2.8 * 60 * 60_000) },
      { conversationId: convMariana.id, direction: 'INBOUND', type: 'TEXT', content: 'Excelente! Pode ser amanhã às 14h? Vocês conseguem integrar com ActiveCampaign também?', status: 'RECEIVED', createdAt: new Date(Date.now() - 10 * 60_000) },
    ]
  });

  // Conversa 2: E-mail Thiago Rocha (Apex Partners) - Formal e Longa
  const convThiago = await prisma.conversation.create({
    data: {
      workspaceId,
      contactId: contacts.find(c => c.name === 'Thiago Rocha').id,
      assigneeId: team.find(u => u.name === 'Amanda Costa').id,
      platform: 'EMAIL',
      status: 'OPEN',
      updatedAt: new Date(Date.now() - 30 * 60_000),
    }
  });

  await prisma.message.createMany({
    data: [
      { conversationId: convThiago.id, direction: 'INBOUND', type: 'TEXT', content: 'Assunto: Dúvidas sobre faturamento corporativo via boleto\n\nPrezada equipe da Acme,\n\nGostaria de solicitar uma análise para faturarmos a assinatura Pro anualmente através de emissão de boleto bancário (CNPJ 12.345.678/0001-99). Aguardo retorno das condições de faturamento.\n\nAtenciosamente,\nThiago Rocha - CFO Apex Partners', status: 'READ', createdAt: new Date(Date.now() - 24 * 60 * 60_000) },
      { conversationId: convThiago.id, direction: 'OUTBOUND', type: 'TEXT', content: 'Olá Thiago,\n\nCom certeza! Nós faturamos planos corporativos em boleto para contratos anuais. Encaminhei a ficha cadastral para o seu e-mail para darmos andamento ao processo de liberação das licenças.\n\nQualquer dúvida estou à disposição.\n\nAmanda Costa - Setor Financeiro Acme Corp', status: 'READ', createdAt: new Date(Date.now() - 20 * 60 * 60_000) },
      { conversationId: convThiago.id, direction: 'INBOUND', type: 'TEXT', content: 'Assunto: Re: Dúvidas sobre faturamento corporativo via boleto\n\nOlá Amanda, acabei de preencher a ficha cadastral e anexei o contrato social. Aguardo a geração do link e nota fiscal.\n\nObrigado!', status: 'READ', createdAt: new Date(Date.now() - 40 * 60_000) },
    ]
  });

  // Conversa 3: WhatsApp Rodrigo Alves (Krypton Digital) - Autopilot com IA Ativo!
  const convRodrigo = await prisma.conversation.create({
    data: {
      workspaceId,
      contactId: contacts.find(c => c.name === 'Rodrigo Alves').id,
      assigneeId: null, // Deixamos sem assignee para mostrar que o Autopilot está atendendo sozinho!
      platform: 'WHATSAPP',
      status: 'OPEN',
      autopilotEnabled: true,
      updatedAt: new Date(Date.now() - 5 * 60_000),
    }
  });

  await prisma.message.createMany({
    data: [
      { conversationId: convRodrigo.id, direction: 'INBOUND', type: 'TEXT', content: 'Bom dia! Gostaria de saber qual o preço dos planos corporativos do CRM e se vocês tem teste grátis?', status: 'READ', createdAt: new Date(Date.now() - 6 * 60_000) },
      { conversationId: convRodrigo.id, direction: 'OUTBOUND', type: 'TEXT', content: '🤖 Olá, Rodrigo! Temos o plano Pro por R$ 299/mês e o Enterprise por R$ 999/mês. Você pode testar qualquer um de nossos planos gratuitamente por 14 dias para conhecer todas as funcionalidades!\n\nAcme Corp (Enterprise)', status: 'SENT', createdAt: new Date(Date.now() - 5.8 * 60_000) },
      { conversationId: convRodrigo.id, direction: 'INBOUND', type: 'TEXT', content: 'Perfeito! E o suporte de vocês funciona em quais horários?', status: 'RECEIVED', createdAt: new Date(Date.now() - 2 * 60_000) },
    ]
  });

  // 13. Criar Pesquisas NPS e Respostas Realistas de Clientes (Promotores, Detratores)
  console.log('😊 Criando dados de NPS...');
  const survey = await prisma.npsSurvey.create({
    data: {
      workspaceId,
      name: 'Satisfação de Clientes Q2',
      triggerType: 'manual'
    }
  });

  const npsFeedbacks = [
    { score: 10, text: 'O atendimento automático por IA via WhatsApp economizou 80% do tempo do nosso time de suporte. Excelente!', class: 'promoter', contact: contacts[0] },
    { score: 10, text: 'Adorei a interface limpa e as cores em modo escuro. O Kanban é muito rápido de usar.', class: 'promoter', contact: contacts[1] },
    { score: 9, text: 'Facilidade nas integrações. Conseguimos conectar nosso Stripe e Asaas em menos de 5 minutos.', class: 'promoter', contact: contacts[2] },
    { score: 8, text: 'Muito bom sistema, atende perfeitamente ao que promete. Poderia ter aplicativo de celular dedicado.', class: 'passive', contact: contacts[3] },
    { score: 7, text: 'O sistema é bom e estável, mas o preço do plano Enterprise é um pouco salgado para startups menores.', class: 'passive', contact: contacts[4] },
    { score: 5, text: 'Tive problemas ao configurar meu número de teste no WhatsApp no primeiro dia, mas depois o suporte ajudou.', class: 'detractor', contact: contacts[5] },
    { score: 10, text: 'A melhor plataforma de CRM e atendimento omnichannel que já testamos. Recomendo muito!', class: 'promoter', contact: await prisma.contact.create({ data: { workspaceId, name: 'Renato Silva', email: 'renato@solutech.com' } }) },
    { score: 9, text: 'Os relatórios de receita dão uma visão perfeita do nosso funil comercial de forma muito clara.', class: 'promoter', contact: await prisma.contact.create({ data: { workspaceId, name: 'Patrícia Sales', email: 'patricia@horizon.com' } }) },
  ];

  for (const nps of npsFeedbacks) {
    await prisma.npsResponse.create({
      data: {
        workspaceId,
        surveyId: survey.id,
        contactId: nps.contact.id,
        score: nps.score,
        classification: nps.class,
        feedbackText: nps.text,
        createdAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60_000) // espalhado nos últimos 15 dias
      }
    });
  }

  // 14. Gerar Histórico Recente de Atividades no Feed
  console.log('🔔 Gerando feed de atividades colaborativas recentes...');
  const activitiesData = [
    { title: 'Negócio movido para Proposta Enviada', content: 'Amanda Costa moveu o negócio "CRM Stark Tech" de Qualificado pela IA para Proposta Enviada.', type: 'DEAL_UPDATED', offsetHours: 2, user: team[1] },
    { title: 'Nova resposta NPS recebida', content: 'Mariana Souza avaliou a plataforma com nota 10 (Promotor): "O atendimento automático por IA via WhatsApp economizou..."', type: 'NPS_RESPONSE', offsetHours: 3, user: null },
    { title: 'Tarefa concluída por Carla Dias', content: 'Tarefa "Cadastrar chaves de webhook de produção" foi marcada como concluída.', type: 'TASK_COMPLETED', offsetHours: 5, user: team[3] },
    { title: 'Negócio criado no funil', content: 'Carla Dias adicionou "Expansão Prime Imóveis" (R$ 28.000) na etapa Lead Frio.', type: 'DEAL_CREATED', offsetHours: 6, user: team[3] },
    { title: 'Mensagem de WhatsApp enviada pelo Autopilot', content: 'O assistente virtual respondeu Rodrigo Alves de forma automática: "Olá, Rodrigo! Temos o plano Pro..."', type: 'AUTOPILOT_REPLY', offsetHours: 8, user: null },
    { title: 'Contato VIP cadastrado', content: 'Mariana Souza foi cadastrada no sistema e associada à Stark Tech com a tag VIP.', type: 'CONTACT_CREATED', offsetHours: 12, user: team[0] },
    { title: 'Relatório Financeiro Exportado', content: 'Lucas Premium gerou e exportou o fechamento consolidado de vendas do mês anterior.', type: 'SYSTEM', offsetHours: 24, user: team[0] },
  ];

  for (const act of activitiesData) {
    await prisma.activity.create({
      data: {
        workspaceId,
        userId: act.user ? act.user.id : null,
        type: act.type,
        title: act.title,
        content: act.content,
        createdAt: new Date(Date.now() - act.offsetHours * 60 * 60_000)
      }
    });
  }

  // 15. Popular Rate Limits Fake Consumo de IA/WhatsApp mais robustos
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.rateLimitCounter.upsert({
    where: { key: `w:${workspaceId}:ai:suggest-reply:day` },
    update: { count: 84, resetAt: tomorrow },
    create: { key: `w:${workspaceId}:ai:suggest-reply:day`, count: 84, resetAt: tomorrow }
  });

  await prisma.rateLimitCounter.upsert({
    where: { key: `w:${workspaceId}:ai:autopilot:day` },
    update: { count: 128, resetAt: tomorrow },
    create: { key: `w:${workspaceId}:ai:autopilot:day`, count: 128, resetAt: tomorrow }
  });

  await prisma.rateLimitCounter.upsert({
    where: { key: `w:${workspaceId}:ai:tokens:day` },
    update: { count: 184500, resetAt: tomorrow },
    create: { key: `w:${workspaceId}:ai:tokens:day`, count: 184500, resetAt: tomorrow }
  });

  console.log('\n==========================================================');
  console.log('🎉 BANCO DE DADOS POPULADO COM DADOS RICOS PARA DIVULGAÇÃO!');
  console.log('==========================================================');
  console.log(`➡️  Dono do Workspace: ${ownerEmail} / Senha: SenhaForte123!`);
  console.log(`➡️  Workspace: acme-corp-premium | Nome: ${workspace.name}`);
  console.log('➡️  Membros da equipe criados: Amanda, Bruno e Carla');
  console.log('➡️  Empresas, Contatos, Deals, NPS, Atividades e Inbox populados.');
  console.log('==========================================================\n');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
