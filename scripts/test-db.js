const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('Testing database connection with URL:', (process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL).split('@')[1]);
  try {
    const start = Date.now();
    const config = await prisma.systemConfig.findMany({ take: 1 });
    const end = Date.now();
    console.log(`Connection successful! Found ${config.length} config entries in ${end - start}ms.`);
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
