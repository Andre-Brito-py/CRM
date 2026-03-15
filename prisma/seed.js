const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const main = async () => {
  const email = process.env.SUPERADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';

  if (!email) {
    throw new Error('Missing SUPERADMIN_EMAIL (or ADMIN_EMAIL)');
  }

  if (!password) {
    throw new Error('Missing SUPERADMIN_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      role: 'SUPERADMIN',
      emailVerified: new Date(),
      password: passwordHash,
    },
    update: {
      name,
      role: 'SUPERADMIN',
      emailVerified: new Date(),
      password: passwordHash,
    },
  });

  const safeUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  };

  if (prisma.paymentProvider) {
    await prisma.paymentProvider.createMany({
      data: [
        { name: 'asaas', displayName: 'Asaas', status: 'active' },
        { name: 'stripe', displayName: 'Stripe', status: 'active' },
        { name: 'pagarme', displayName: 'Pagar.me', status: 'disabled' },
        { name: 'mercadopago', displayName: 'Mercado Pago', status: 'disabled' },
      ],
      skipDuplicates: true,
    });
  }

  await prisma.plan.upsert({
    where: { slug: 'FREE' },
    create: {
      name: 'Starter',
      slug: 'FREE',
      description: 'Perfect for solo entrepreneurs and small side projects.',
      price: 0,
      currency: 'BRL',
      interval: 'month',
      features: ['1 WhatsApp Number', '100 Contacts', 'Basic Support'],
      isActive: true,
    },
    update: {
      name: 'Starter',
      description: 'Perfect for solo entrepreneurs and small side projects.',
      price: 0,
      currency: 'BRL',
      interval: 'month',
      features: ['1 WhatsApp Number', '100 Contacts', 'Basic Support'],
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { slug: 'STANDARD' },
    create: {
      name: 'Standard',
      slug: 'STANDARD',
      description: 'Perfect for growing teams and serious businesses.',
      price: 149,
      currency: 'BRL',
      interval: 'month',
      features: ['5 WhatsApp Numbers', 'Unlimited Contacts', 'Basic Analytics'],
      isActive: true,
    },
    update: {
      name: 'Standard',
      description: 'Perfect for growing teams and serious businesses.',
      price: 149,
      currency: 'BRL',
      interval: 'month',
      features: ['5 WhatsApp Numbers', 'Unlimited Contacts', 'Basic Analytics'],
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { slug: 'PREMIUM' },
    create: {
      name: 'Premium',
      slug: 'PREMIUM',
      description: 'Unlimited possibilities for large organizations and enterprises.',
      price: 399,
      currency: 'BRL',
      interval: 'month',
      features: ['Unlimited WhatsApp Numbers', 'Advanced Analytics', 'AI Reply Suggestions', '24/7 Phone Support'],
      isActive: true,
    },
    update: {
      name: 'Premium',
      description: 'Unlimited possibilities for large organizations and enterprises.',
      price: 399,
      currency: 'BRL',
      interval: 'month',
      features: ['Unlimited WhatsApp Numbers', 'Advanced Analytics', 'AI Reply Suggestions', '24/7 Phone Support'],
      isActive: true,
    },
  });

  console.info(safeUser);
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
