const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@test.com'; // Subagent's likely email
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'SUPERADMIN' },
    create: {
      email,
      name: 'Admin Test',
      role: 'SUPERADMIN'
    }
  });
  console.log('User created/updated:', user);

  // Also update the local test one just in case
  await prisma.user.updateMany({
    where: { email: 'superadmin@local.test' },
    data: { role: 'SUPERADMIN' }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
