const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const slug = 'primeiro-wrks-1';
  console.log(`Checking database for workspace slug: ${slug}`);

  const workspace = await prisma.workspace.findFirst({
    where: { slug },
    include: {
      integrations: true,
      members: true
    }
  });

  if (!workspace) {
    console.log('ERROR: Workspace not found in DB!');
  } else {
    console.log('WORKSPACE FOUND:');
    console.log(`- ID: ${workspace.id}`);
    console.log(`- Name: ${workspace.name}`);
    console.log(`- Members: ${workspace.members.length}`);
    console.log(`- Integrations Total: ${workspace.integrations.length}`);
    
    workspace.integrations.forEach((int, i) => {
      console.log(`\nINTEGRATION #${i+1}:`);
      console.log(`- ID: ${int.id}`);
      console.log(`- Provider: ${int.provider}`);
      console.log(`- Enabled: ${int.enabled}`);
      console.log(`- Credentials keys: ${Object.keys(int.credentials || {}).join(', ')}`);
    });
  }

  // Also check ALL integrations for WHATSAPP to see if they are in wrong workspaces
  const allWa = await prisma.integration.findMany({
    where: { provider: { contains: 'WHATSAPP', mode: 'insensitive' } },
    include: { workspace: true }
  });

  console.log(`\n--- GLOBAL WHATSAPP INTEGRATIONS CHECK (${allWa.length} total) ---`);
  allWa.forEach(w => {
    console.log(`- ID: ${w.id} | Workspace: ${w.workspace.slug} | Provider: ${w.provider}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
