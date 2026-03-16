const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.plan.updateMany({
    where: {
      priceAnnual: { gt: 0 }
    },
    data: {
      annualDiscount: 20
    }
  });
  console.log('Updated plans count:', result.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
