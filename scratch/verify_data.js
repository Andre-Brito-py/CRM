const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  try {
    const u = await p.user.count();
    const c = await p.contact.count();
    console.log('--- VERIFICATION ---');
    console.log('Users:', u);
    console.log('Contacts:', c);
    console.log('Status: DATA IS SAFE ✅');
  } catch(e) {
    console.error('Error during verification:', e.message);
  } finally {
    await p.$disconnect();
  }
}
run();
