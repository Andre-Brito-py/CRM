import prisma from '@/prisma/index';

export const sendInstagramMessage = async (integrationId, to, text) => {
  // 1. Get Integration Credentials
  const integration = await prisma.integration.findUnique({
    where: {
      id: integrationId,
    },
  });

  if (!integration || !integration.enabled || !integration.credentials) {
    throw new Error('Instagram integration not configured, disabled, or not found');
  }

  const { accessToken } = integration.credentials;

  if (!accessToken) {
    throw new Error('Missing Instagram access token');
  }

  // 2. Call Meta Graph API for Instagram Messaging
  const url = `https://graph.facebook.com/v16.0/me/messages?access_token=${accessToken}`;

  const payload = {
    recipient: { id: to },
    message: { text: text },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Instagram API Error:', data);
    throw new Error(data.error?.message || 'Failed to send Instagram message');
  }

  return data.message_id; // Returns mid
};
