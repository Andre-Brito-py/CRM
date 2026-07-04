import prisma from '@/prisma/index';
import { checkWhatsAppLimit, recordWhatsAppUsage } from '@/lib/server/whatsapp-usage';
import { normalizeWhatsAppNumber } from '@/lib/server/phone';
import { getSystemConfig } from '@/lib/server/config';

/**
 * Send an outbound WhatsApp message via the Meta Cloud API or Evolution API.
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

  if (!integration || !integration.enabled) {
    throw new Error('WhatsApp integration not configured, disabled, or not found');
  }

  const workspaceId = context?.workspaceId || integration.workspaceId;
  const userId = context?.userId || null;

  // Evolution API Flow
  if (integration.provider === 'EVOLUTION') {
    const evoUrl = await getSystemConfig('EVOLUTION_API_URL', process.env.EVOLUTION_API_URL);
    const evoApiKey = await getSystemConfig('EVOLUTION_API_KEY', process.env.EVOLUTION_API_KEY);

    if (!evoUrl || !evoApiKey) {
      throw new Error('Evolution API is not configured in Super Admin settings.');
    }

    const instanceName = `vysify-${workspaceId}`;
    const { clean: recipientPhone } = normalizeWhatsAppNumber(to);

    const response = await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': evoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: recipientPhone,
        text: text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[evolution-send-error] API Response:', data);
      throw new Error(data?.message || 'Failed to send WhatsApp message via Evolution API');
    }

    const messageId = data?.key?.id || data?.message?.key?.id || null;

    if (workspaceId) {
      recordWhatsAppUsage({
        workspaceId,
        userId,
        messageId,
        direction: 'OUTBOUND',
        overageMode: false,
      });
    }

    return messageId;
  }

  // Meta Cloud API Flow (Official)
  if (!integration.credentials) {
    throw new Error('WhatsApp integration credentials missing');
  }

  const { phoneNumberId, accessToken } = integration.credentials;

  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WhatsApp credentials');
  }

  // 2. Check daily limit (always allowed now, but we fetch metadata for logging)
  let limitCheck = null;

  if (workspaceId) {
    limitCheck = await checkWhatsAppLimit(workspaceId);
    // Even though it's always allowed, we keep the check call to maintain the flow 
    // and potentially catch configuration errors in checkWhatsAppLimit.
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.error || 'WhatsApp daily message limit reached');
    }
  }

  // 3. Call Meta Graph API
  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;

  // Normalize the recipient number
  const { clean: recipientPhone } = normalizeWhatsAppNumber(to);

  const payload = {
    messaging_product: 'whatsapp',
    to: recipientPhone,
    type: 'text',
    text: { body: text },
  };

  if (context && context.quotedId) {
    payload.context = { message_id: context.quotedId };
  }

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

  // 4. Record the usage event (fire-and-forget, for internal FinOps tracking)
  if (workspaceId) {
    recordWhatsAppUsage({
      workspaceId,
      userId,
      messageId: wamid,
      direction: 'OUTBOUND',
      overageMode: false, // Overage mode is no longer applicable for WA
    });
  }


  return wamid;
};
