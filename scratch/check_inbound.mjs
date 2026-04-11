import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInbound() {
  const ws = await prisma.workspace.findFirst({
    where: { slug: 'primeiro-wrks-1' }
  });
  if (!ws) return console.log('no workspace');
  
  const conversations = await prisma.conversation.findMany({
    where: { workspaceId: ws.id, platform: 'WHATSAPP' },
    select: {
      id: true,
      externalId: true,
      messages: {
        where: { direction: 'INCOMING' },
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  for (const c of conversations) {
    if (c.messages.length > 0) {
      console.log(`Conv ${c.externalId}:`);
      console.log(c.messages);
    }
  }
}

checkInbound().finally(() => prisma.$disconnect());
