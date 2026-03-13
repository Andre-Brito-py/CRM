import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;
const databaseUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
const prismaClientOptions = databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {};
const prisma = globalForPrisma.prisma || new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
