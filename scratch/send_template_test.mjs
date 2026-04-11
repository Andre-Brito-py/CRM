import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function main() {
  const ws = await prisma.workspace.findFirst();
  console.log('Workspace:', ws.id, ws.slug);

  const integration = await prisma.integration.findFirst({
    where: { provider: 'WHATSAPP', enabled: true }
  });

  if (!integration || !integration.credentials) {
    console.error('No whatsapp integration found.');
    return;
  }

  const { accessToken, phoneNumberId } = typeof integration.credentials === 'string' 
    ? JSON.parse(integration.credentials) 
    : integration.credentials;

  console.log('Phone Number ID:', phoneNumberId);
  console.log('Access Token Length:', accessToken?.length || 0);

  const toPhone = '5583986952426';

  console.log(`\n--- Sending hello_world en_US ---`);
  const metaUrl = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: toPhone,
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: 'en_US' }
    }
  };

  const response = await fetch(metaUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log('HTTP Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

}

main().catch(console.error).finally(() => prisma.$disconnect());
