const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.findFirst({ where: { slug: 'acme-corp-premium' } });
  if (!workspace) return console.log('Workspace não encontrado.');

  console.log(`\n🏢 Workspace: ${workspace.name} (${workspace.id})\n`);

  const contacts = await prisma.contact.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true, phone: true, email: true },
    take: 20,
  });

  console.log(`👥 Contatos (${contacts.length}):`);
  contacts.forEach(c => console.log(`  - ${c.name} | phone: ${c.phone || 'N/A'} | email: ${c.email || 'N/A'} | id: ${c.id}`));

  const conversations = await prisma.conversation.findMany({
    where: { workspaceId: workspace.id },
    include: { contact: { select: { name: true, phone: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`\n💬 Conversas (${conversations.length}):`);
  conversations.forEach(c => console.log(`  - [${c.platform}] ${c.contact?.name} | status: ${c.status} | autopilot: ${c.autopilotEnabled} | id: ${c.id}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
