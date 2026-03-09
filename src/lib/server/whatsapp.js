import prisma from '@/prisma/index';

export const sendWhatsAppMessage = async (integrationId, to, text) => {
  // 1. Get Integration Credentials by explicit integrationId
  const integration = await prisma.integration.findUnique({
    where: {
      id: integrationId,
    },
  });

  if (!integration || !integration.enabled || !integration.credentials) {
    throw new Error('WhatsApp integration not configured, disabled, or not found');
  }

  const { phoneNumberId, accessToken } = integration.credentials;

  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WhatsApp credentials');
  }

  // 2. Call Meta Graph API
  const url = `https://graph.facebook.com/v16.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: text },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('WhatsApp API Error:', data);
    throw new Error(data.error?.message || 'Failed to send WhatsApp message');
  }

  return data.messages[0].id; // Returns wamid
};
