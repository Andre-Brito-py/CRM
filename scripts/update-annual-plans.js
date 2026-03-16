const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.plan.findMany();
    
    console.log(`Initial plan count: ${plans.length}`);
    
    for (const plan of plans) {
        if (plan.price > 0 && (!plan.priceAnnual || plan.priceAnnual === 0)) {
            // Apply a 20% discount for the annual plan
            // Formula: Monthly Price * 12 months * 0.8 (20% off)
            const annualPrice = Math.round((plan.price * 12 * 0.8) * 100) / 100;
            
            console.log(`Updating Plan ${plan.name} (${plan.slug}): Monthly price = ${plan.price}, Annual price set to = ${annualPrice}`);
            
            await prisma.plan.update({
                where: { id: plan.id },
                data: {
                    priceAnnual: annualPrice,
                }
            });
        } else if (plan.price === 0) {
            console.log(`Skipping free plan ${plan.name}.`);
        } else {
             console.log(`Skipping plan ${plan.name} because it already has an annual price: ${plan.priceAnnual}.`);
        }
    }
    
    console.log('Finished updating plans.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
