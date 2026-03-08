const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const main = async () => {
  try {
    // Create Super Admin
    const adminEmail = 'admin@nextacular.com';
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: 'SUPERADMIN' },
      create: {
        email: adminEmail,
        name: 'Super Admin',
        role: 'SUPERADMIN',
      },
    });
    console.log(`✅ Super Admin created/updated: ${adminEmail}`);

    // Create Client (Regular User)
    const clientEmail = 'client@nextacular.com';
    const client = await prisma.user.upsert({
      where: { email: clientEmail },
      update: { role: 'USER' },
      create: {
        email: clientEmail,
        name: 'Client User',
        role: 'USER',
      },
    });
    console.log(`✅ Client User created/updated: ${clientEmail}`);

    // Create a Workspace for Client if not exists
    // First check if user has any workspace via Member
    const member = await prisma.member.findFirst({
      where: { email: clientEmail }
    });

    if (!member) {
      const workspaceName = 'Client Workspace';
      const workspaceSlug = 'client-workspace';

      // Check if slug exists to avoid unique constraint error
      const existingWorkspace = await prisma.workspace.findFirst({
        where: { slug: workspaceSlug }
      });

      if (!existingWorkspace) {
        const workspace = await prisma.workspace.create({
          data: {
            name: workspaceName,
            slug: workspaceSlug,
            creatorId: client.id,
            members: {
              create: {
                member: { connect: { email: clientEmail } },
                teamRole: 'OWNER',
                status: 'ACCEPTED',
                invitedBy: { connect: { email: clientEmail } }
              }
            }
          }
        });
        console.log(`✅ Workspace created for client: ${workspace.name} (${workspace.slug})`);
      } else {
        // Add member to existing workspace if not member
        await prisma.member.create({
          data: {
            workspace: { connect: { id: existingWorkspace.id } },
            member: { connect: { email: clientEmail } },
            teamRole: 'OWNER',
            status: 'ACCEPTED', // Assuming valid
            invitedBy: { connect: { email: clientEmail } } // Self-invite? Or just leave it undefined if optional.
          }
        });
        console.log(`✅ Added client to existing workspace: ${existingWorkspace.name}`);
      }
    } else {
      console.log(`ℹ️ Client already has a workspace membership.`);
    }

  } catch (e) {
    console.error('Error creating users:', e);
    process.exit(1);
  }
};

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
