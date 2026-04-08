const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const errors = await prisma.systemError.findMany({
    orderBy: { id: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(errors, null, 2));
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
