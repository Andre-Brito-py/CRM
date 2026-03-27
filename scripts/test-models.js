require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const config = await prisma.systemConfig.findUnique({ where: { key: 'GOOGLE_AI_API_KEY' } });
  const key = config?.value || process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    console.log('No Google API Key found');
    return;
  }
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  
  if (data.models) {
    data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
  } else {
    console.log('Error', data);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
