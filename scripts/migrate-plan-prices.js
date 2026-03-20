const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({
    include: { prices: true }
  });

  for (const plan of plans) {
    if (plan.prices.length === 0 && plan.price !== undefined) {
      console.log(`Migrating plan ${plan.slug}...`);
      await prisma.planPrice.create({
        data: {
          planId: plan.id,
          currency: plan.currency || 'USD',
          amount: plan.price,
          amountAnnual: plan.priceAnnual,
          stripePriceId: plan.stripePriceId,
          stripePriceIdAnnual: plan.stripePriceIdAnnual,
        }
      });
      console.log(`Plan ${plan.slug} migrated.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
