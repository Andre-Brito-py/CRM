const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email address');
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'SUPERADMIN' },
  });

  console.log(`User ${user.email} promoted to SUPERADMIN`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
