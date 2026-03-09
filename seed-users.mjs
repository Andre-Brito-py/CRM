import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning existing users...');
    // Delete all users. Cascade should handle workspaces, integrations, etc.
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" CASCADE;`);

    console.log('Users cleaned.');

    const passwordHash = await bcrypt.hash('password123', 10);

    console.log('Creating Super Admin user...');
    const admin = await prisma.user.create({
        data: {
            name: 'Super Admin',
            email: 'admin@example.com',
            password: passwordHash,
            role: 'SUPERADMIN',
            emailVerified: new Date(),
        }
    });

    console.log('Creating Premium Customer user...');
    const customer = await prisma.user.create({
        data: {
            name: 'Premium User',
            email: 'premium@example.com',
            password: passwordHash,
            role: 'USER',
            emailVerified: new Date(),
            customerPayment: {
                create: {
                    paymentId: 'cus_premium_123',
                    subscriptionType: 'PREMIUM'
                }
            }
        }
    });

    console.log('Done!');
    console.log('Admin:', admin.email, 'password123');
    console.log('Premium:', customer.email, 'password123');
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    });
