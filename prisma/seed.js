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
