const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  try {
    const wCount = await p.workspace.count();
    const wActive = await p.workspace.count({ where: { deletedAt: null } });
    const first = await p.workspace.findFirst({
        select: { id: true, name: true, slug: true, deletedAt: true, creatorId: true }
    });
    const users = await p.user.count();

    console.log('--- WORKSPACE AUDIT ---');
    console.log('Users Total:', users);
    console.log('Workspaces Total:', wCount);
    console.log('Workspaces Active (deletedAt null):', wActive);
    console.log('First Workspace Info:', JSON.stringify(first, null, 2));

  } catch(e) {
    console.error('Audit failed:', e.message);
  } finally {
    await p.$disconnect();
  }
}
run();
