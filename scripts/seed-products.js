const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Find a workspace to link these products to
    const workspaces = await prisma.workspace.findMany();
    if (workspaces.length === 0) {
      console.error('No workspaces found! Please run the seed first.');
      return;
    }

    // Seed products for all workspaces or just the first one
    const targetWorkspace = workspaces[0];
    console.log(`Seeding products for workspace: ${targetWorkspace.name} (${targetWorkspace.id})`);

    const productsData = [
      {
        name: "Cafeteira Inteligente Express",
        slug: "cafeteira-inteligente",
        description: "Cafeteira inteligente de alta tecnologia com tela touchscreen, controle por aplicativo e moedor de grãos integrado.",
        price: 1299.90,
        currency: "BRL",
        imageUrl: "/images/products/coffee_maker.png",
        active: true,
        workspaceId: targetWorkspace.id
      },
      {
        name: "Cadeira Ergonômica Premium",
        slug: "cadeira-ergonomica",
        description: "Cadeira ergonômica premium com suporte lombar ajustável, apoios de braço 3D, estrutura em alumínio e tecido mesh respirável.",
        price: 1899.00,
        currency: "BRL",
        imageUrl: "/images/products/ergo_chair.png",
        active: true,
        workspaceId: targetWorkspace.id
      },
      {
        name: "Fone de Ouvido Noise-Canceling",
        slug: "fone-noise-canceling",
        description: "Fone de ouvido over-ear premium com cancelamento de ruído ativo inteligente, bateria de até 40 horas e alta fidelidade sonora.",
        price: 999.00,
        currency: "BRL",
        imageUrl: "/images/products/headphones.png",
        active: true,
        workspaceId: targetWorkspace.id
      }
    ];

    for (const data of productsData) {
      const product = await prisma.paymentProduct.upsert({
        where: {
          workspaceId_slug: {
            workspaceId: data.workspaceId,
            slug: data.slug
          }
        },
        create: data,
        update: data
      });
      console.log(`Saved product: ${product.name} with URL ${product.imageUrl}`);
    }

    console.log('Seeding finished successfully.');
  } catch (err) {
    console.error('Error seeding products:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
