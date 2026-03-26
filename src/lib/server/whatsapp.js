import prisma from '@/prisma/index';
import { checkWhatsAppLimit, recordWhatsAppUsage } from '@/lib/server/whatsapp-usage';

/**
 * Send an outbound WhatsApp message via the Meta Cloud API.
 *
 * Now includes:
 *  1. Plan-based daily limit check (maxWhatsAppMessages24h)
 *  2. Usage event recording after successful send
 *
 * @param {string} integrationId - The integration record ID
 * @param {string} to - Recipient phone number
 * @param {string} text - Message text body
 * @param {object} [context] - Optional context for usage tracking
 * @param {string|null} [context.workspaceId] - Workspace ID (enables limit enforcement)
 * @param {string|null} [context.userId] - User ID of the sender
 */
export const sendWhatsAppMessage = async (integrationId, to, text, context = {}) => {
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

  // 2. Check daily limit (uses integration.workspaceId if context.workspaceId not provided)
  const workspaceId = context?.workspaceId || integration.workspaceId;
  const userId = context?.userId || null;

  if (workspaceId) {
    const limitCheck = await checkWhatsAppLimit(workspaceId);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.error || 'WhatsApp daily message limit reached');
    }
  }

  // 3. Call Meta Graph API
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

  const wamid = data.messages?.[0]?.id || null;

  // 4. Record the usage event (fire-and-forget, never blocks the response)
  if (workspaceId) {
    recordWhatsAppUsage({
      workspaceId,
      userId,
      messageId: wamid,
      direction: 'OUTBOUND',
      overageMode: false,
    });
  }

  return wamid;
};
