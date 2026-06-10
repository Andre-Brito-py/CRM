require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    console.log('No workspace found');
    return;
  }

  // 1. Create a bookable service
  const service = await prisma.paymentProduct.create({
    data: {
      workspaceId: workspace.id,
      name: 'Consulta Médica Online',
      slug: `consulta-medica-${Date.now()}`,
      description: 'Consulta com especialista',
      currency: 'BRL',
      price: 250.00,
      active: true,
      isBookable: true,
      durationMinutes: 60,
      requiresPayment: true,
    }
  });

  console.log(`Created service: ${service.name}`);

  // 2. Create contact
  const contact = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: 'João Paciente',
      phone: `551199999${Math.floor(Math.random()*1000)}`,
    }
  });

  // 3. Create conversation
  const conversation = await prisma.conversation.create({
    data: {
      workspaceId: workspace.id,
      contactId: contact.id,
      platform: 'WHATSAPP',
      status: 'OPEN',
      autopilotEnabled: true,
    }
  });

  console.log(`Created conversation: ${conversation.id}`);

  // 4. Populate messages for Consultation
  const messages = [
    { direction: 'INBOUND', type: 'TEXT', content: 'Olá, gostaria de agendar uma consulta médica.', status: 'RECEIVED' },
    { direction: 'OUTBOUND', type: 'TEXT', content: 'Olá João! Temos o serviço de "Consulta Médica Online" (60 min) disponível. Para quando você gostaria de agendar?', status: 'SENT' },
    { direction: 'INBOUND', type: 'TEXT', content: 'Para amanhã de manhã.', status: 'RECEIVED' },
    { direction: 'OUTBOUND', type: 'TEXT', content: 'Certo, verifiquei a disponibilidade. Tenho horários livres amanhã às 09:00 e às 10:30. Qual prefere?', status: 'SENT' },
    { direction: 'INBOUND', type: 'TEXT', content: 'Às 10:30 fica ótimo.', status: 'RECEIVED' },
    { direction: 'OUTBOUND', type: 'TEXT', content: `Perfeito! Agendei a sua consulta para amanhã às 10:30. \n\nPor favor, realize o pagamento através deste link para confirmar o agendamento: https://vysify.com/p/${workspace.slug}/${service.slug}`, status: 'SENT' },
  ];

  for (const msg of messages) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: msg.direction,
        type: msg.type,
        content: msg.content,
        status: msg.status,
      }
    });
  }

  // 5. Create another conversation for simple meeting
  const contact2 = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: 'Maria Parceira',
      phone: `551188888${Math.floor(Math.random()*1000)}`,
    }
  });

  const conversation2 = await prisma.conversation.create({
    data: {
      workspaceId: workspace.id,
      contactId: contact2.id,
      platform: 'WHATSAPP',
      status: 'OPEN',
      autopilotEnabled: true,
    }
  });

  const messages2 = [
    { direction: 'INBOUND', type: 'TEXT', content: 'Oi, queria marcar uma reunião rápida para falarmos da parceria.', status: 'RECEIVED' },
    { direction: 'OUTBOUND', type: 'TEXT', content: 'Olá Maria! Claro, posso marcar. Você prefere hoje à tarde ou amanhã?', status: 'SENT' },
    { direction: 'INBOUND', type: 'TEXT', content: 'Hoje às 15h é possível?', status: 'RECEIVED' },
    { direction: 'OUTBOUND', type: 'TEXT', content: 'Sim, agendei nossa reunião para hoje às 15:00. O convite foi enviado para o seu calendário.', status: 'SENT' },
  ];

  for (const msg of messages2) {
    await prisma.message.create({
      data: {
        conversationId: conversation2.id,
        direction: msg.direction,
        type: msg.type,
        content: msg.content,
        status: msg.status,
      }
    });
  }

  console.log(`Created meeting conversation: ${conversation2.id}`);
  console.log('Seed completed successfully!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
