const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function upsertSystemConfig(key, value) {
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value), category: 'BILLING' }
  });
}

async function main() {
  console.log('Seeding System configs (Fees for Sales, AI, WhatsApp)...');
  await upsertSystemConfig('PLATFORM_FEE_PERCENTAGE', '2.99');
  await upsertSystemConfig('PLATFORM_FEE_FIXED', '1.00');
  await upsertSystemConfig('AI_OVERAGE_FEE_PER_1K', '0.15');
  await upsertSystemConfig('WHATSAPP_FEE_PER_MESSAGE', '0.10');

  console.log('Seeding Plans and Prices...');
  
  // 1. Starter
  const starter = await prisma.plan.upsert({
    where: { slug: 'STARTER' },
    update: {
      name: 'Starter', price: 147, priceAnnual: 1470, annualDiscount: 16.6, currency: 'BRL', interval: 'month',
      features: ['1 WhatsApp Number', '1,000 Contacts', '2,000 AI Tokens', 'Smart Pipeline CRM', 'Basic Support'],
      isActive: true,
      description: 'Ideal para profissionais autônomos e pequenos negócios.'
    },
    create: {
      name: 'Starter', slug: 'STARTER', price: 147, priceAnnual: 1470, annualDiscount: 16.6, currency: 'BRL', interval: 'month',
      features: ['1 WhatsApp Number', '1,000 Contacts', '2,000 AI Tokens', 'Smart Pipeline CRM', 'Basic Support'],
      isActive: true,
      description: 'Ideal para profissionais autônomos e pequenos negócios.'
    }
  });

  // 2. Standard
  const standard = await prisma.plan.upsert({
    where: { slug: 'STANDARD' },
    update: {
      name: 'Standard', price: 397, priceAnnual: 3970, annualDiscount: 16.6, currency: 'BRL', interval: 'month',
      features: ['3 WhatsApp Numbers', 'Unlimited Contacts', '15,000 AI Tokens', 'Automations & Webhooks', 'Priority Support'],
      isActive: true,
      description: 'Essencial para times em crescimento e automações robustas.'
    },
    create: {
      name: 'Standard', slug: 'STANDARD', price: 397, priceAnnual: 3970, annualDiscount: 16.6, currency: 'BRL', interval: 'month',
      features: ['3 WhatsApp Numbers', 'Unlimited Contacts', '15,000 AI Tokens', 'Automations & Webhooks', 'Priority Support'],
      isActive: true,
      description: 'Essencial para times em crescimento e automações robustas.'
    }
  });

  // 3. Premium
  const premium = await prisma.plan.upsert({
    where: { slug: 'PREMIUM' },
    update: {
      name: 'Premium', price: 997, priceAnnual: 9970, annualDiscount: 16.6, currency: 'BRL', interval: 'month',
      features: ['10 WhatsApp Numbers', 'Unlimited Contacts', '100,000 AI Tokens', 'AI Autopilot 24/7', 'Dedicated Account Manager'],
      isActive: true,
      description: 'Para operações de alto volume e controle absoluto com I.A.'
    },
    create: {
      name: 'Premium', slug: 'PREMIUM', price: 997, priceAnnual: 9970, annualDiscount: 16.6, currency: 'BRL', interval: 'month',
      features: ['10 WhatsApp Numbers', 'Unlimited Contacts', '100,000 AI Tokens', 'AI Autopilot 24/7', 'Dedicated Account Manager'],
      isActive: true,
      description: 'Para operações de alto volume e controle absoluto com I.A.'
    }
  });

  // Seed Multi-Currency Prices
  const currencies = ['USD', 'EUR', 'GBP'];
  const prices = {
    'STARTER':  { USD: [29, 290], EUR: [29, 290], GBP: [25, 250] },
    'STANDARD': { USD: [79, 790], EUR: [75, 750], GBP: [65, 650] },
    'PREMIUM':  { USD: [199, 1990], EUR: [189, 1890], GBP: [169, 1690] }
  };

  const plans = { 'STARTER': starter.id, 'STANDARD': standard.id, 'PREMIUM': premium.id };

  // Clear existing multi-currency prices specifically to prevent duplicates
  await prisma.planPrice.deleteMany({});
  
  for (const [slug, planId] of Object.entries(plans)) {
    for (const currency of currencies) {
      await prisma.planPrice.create({
        data: {
          planId,
          currency,
          amount: prices[slug][currency][0],
          amountAnnual: prices[slug][currency][1]
        }
      });
    }
  }

  // Ensure "FREE" plan is disabled to force paid usage
  try {
    const freePlan = await prisma.plan.findUnique({ where: { slug: 'FREE' } });
    if (freePlan) {
      await prisma.plan.update({ where: { slug: 'FREE' }, data: { isActive: false } });
    }
  } catch(e) {}

  console.log('Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
