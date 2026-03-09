import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding default plans...');

    const plans = [
        {
            name: 'Free',
            slug: 'free',
            description: 'Ideal for small projects and individuals.',
            price: 0,
            currency: 'USD',
            interval: 'month',
            features: {
                maxUsers: 1,
                maxWorkspaces: 1,
                maxWANumbers: 1,
                aiAssistant: false,
            },
            isActive: true,
        },
        {
            name: 'Standard',
            slug: 'standard',
            description: 'Perfect for growing teams.',
            price: 29,
            currency: 'USD',
            interval: 'month',
            features: {
                maxUsers: 5,
                maxWorkspaces: 3,
                maxWANumbers: 3,
                aiAssistant: true,
            },
            isActive: true,
        },
        {
            name: 'Premium',
            slug: 'premium',
            description: 'Unlimited possibilities for large organizations.',
            price: 99,
            currency: 'USD',
            interval: 'month',
            features: {
                maxUsers: 100,
                maxWorkspaces: 10,
                maxWANumbers: 10,
                aiAssistant: true,
            },
            isActive: true,
        },
    ];

    for (const plan of plans) {
        await prisma.plan.upsert({
            where: { slug: plan.slug },
            update: plan,
            create: plan,
        });
    }

    console.log('Plans seeded successfully!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
