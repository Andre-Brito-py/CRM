import prisma from '@/prisma/index';
import { processAutomation } from '@/prisma/services/automation';
import { createActivity } from '@/prisma/services/activity';
import { createMessage } from '@/prisma/services/conversation';
import { log, reportError } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';
import { getSystemConfig } from '@/lib/server/config';
import { processAutopilotReply } from '@/lib/server/autopilot';

const clampText = (value, max) => {
  const s = String(value ?? '');
  if (s.length <= max) return s;
  return s.slice(0, max);
};

const isConsentText = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return false;
  return (
    /\b(consinto|autorizo|autorizacao|autorização|i\s+consent|i\s+authorize)\b/i.test(text) ||
    text === 'ok' ||
    text === 'sim'
  );
};

const toMessageType = (msgType) => {
  const t = String(msgType || '').toLowerCase();
  if (t === 'text') return 'TEXT';
  if (t === 'image') return 'IMAGE';
  if (t === 'document') return 'DOCUMENT';
  if (t === 'audio') return 'AUDIO';
  return 'UNKNOWN';
};

const extractMediaId = (message, msgType) => {
  const t = String(msgType || '').toLowerCase();
  if (t === 'image') return message?.image?.id || null;
  if (t === 'document') return message?.document?.id || null;
  if (t === 'audio') return message?.audio?.id || null;
  return null;
};

const buildInitialBody = (message, msgType) => {
  const t = String(msgType || '').toLowerCase();
  if (t === 'text') return message?.text?.body || '';
  if (t === 'image') return message?.image?.caption || '[Image]';
  if (t === 'document') return message?.document?.caption || '[Document]';
  if (t === 'audio') return '[Audio]';
  return `[${t || 'unknown'}]`;
};

const findWhatsAppIntegration = async (workspaceId, phoneNumberId) => {
  if (!workspaceId || !phoneNumberId) return null;
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId,
        provider: 'WHATSAPP',
        enabled: true,
        credentials: { path: ['phoneNumberId'], equals: String(phoneNumberId) },
      },
    });
    if (integration) return integration;
  } catch {
    null;
  }

  const integrations = await prisma.integration.findMany({
    where: { workspaceId, provider: 'WHATSAPP', enabled: true },
  });
  return integrations.find((i) => String(i?.credentials?.phoneNumberId || '') === String(phoneNumberId)) || null;
};

const fetchWhatsAppMediaMetadata = async ({ accessToken, mediaId }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const resp = await fetch(`https://graph.facebook.com/v17.0/${encodeURIComponent(mediaId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`whatsapp_media_metadata_failed:${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(timeout);
  }
};

const downloadWhatsAppMedia = async ({ accessToken, url, maxBytes }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`whatsapp_media_download_failed:${resp.status}`);
    const contentLength = Number(resp.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > 0 && contentLength > maxBytes) {
      throw new Error('media_too_large');
    }
    const arrayBuffer = await resp.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) throw new Error('media_too_large');
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
};

const transcribeAudio = async ({ openAiApiKey, audioBytes, mimeType }) => {
  const { transcribeAudio: aiTranscribe } = await import('@/lib/server/ai/index');
  try {
    return await aiTranscribe({ audioBytes, mimeType });
  } catch (error) {
    log({ level: 'error', msg: 'whatsapp_ai_transcription_failed', error: error.message });
    throw error;
  }
};

const extractImageText = async ({ openAiApiKey, imageBytes, mimeType }) => {
  const { extractTextFromImage } = await import('@/lib/server/ai/index');
  try {
    return await extractTextFromImage({ imageBytes, mimeType });
  } catch (error) {
    log({ level: 'error', msg: 'whatsapp_ai_vision_failed', error: error.message });
    throw error;
  }
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  if (req.method === 'GET') {
    const rl = await rateLimit({ req, limit: 120, windowMs: 60_000 });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'whatsapp_webhook_verify_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    // Webhook Verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const workspaceSlug = req.query['workspace'];

    if (mode && token) {
      if (mode === 'subscribe' && workspaceSlug) {
        // Find the integration for this workspace to check the verify token
        const workspace = await prisma.workspace.findFirst({
          where: { 
            slug: {
              equals: workspaceSlug,
              mode: 'insensitive'
            }
          },
          include: {
            integrations: {
              where: { 
                provider: {
                  in: ['WHATSAPP', 'whatsapp']
                }
              },
            },
          },
        });

        const integration = workspace?.integrations.find((i) => {
          const creds = typeof i.credentials === 'string' ? JSON.parse(i.credentials || '{}') : (i.credentials || {});
          return String(creds?.verifyToken || '').trim() === String(token).trim();
        });

        if (integration) {
          log({ level: 'info', msg: 'whatsapp_webhook_verified', requestId, workspaceSlug });
          res.setHeader('Content-Type', 'text/plain');
          res.status(200).send(challenge);
        } else {
          log({ level: 'warn', msg: 'whatsapp_webhook_verify_failed', requestId, workspaceSlug });
          res.status(403).json({ error: 'Verification failed' });
        }
      } else {
        res.status(403).json({ error: 'Verification failed' });
      }
    } else {
      res.status(400).json({ error: 'Missing parameters' });
    }
  } else if (req.method === 'POST') {
    const rl = await rateLimit({ req, limit: 600, windowMs: 60_000 });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'whatsapp_webhook_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    // Receive Messages
    const body = req.body;
    const workspaceSlug = req.query['workspace'];
    if (!workspaceSlug) {
      return res.status(400).json({ error: 'Missing workspace parameter' });
    }

    log({
      level: 'info',
      msg: 'whatsapp_webhook_received',
      requestId,
      workspaceSlug,
      hasObject: Boolean(body?.object),
      entryCount: Array.isArray(body?.entry) ? body.entry.length : 0,
    });

    if (body.object) {
      if (body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const value = body.entry[0].changes[0].value;
        const message = value.messages[0];
        const phoneNumberId = value?.metadata?.phone_number_id || null;
        const from = message?.from; // sender phone number
        const msgType = message?.type;
        const wamid = message?.id;
        const timestamp = message?.timestamp;
        const name = value?.contacts?.[0]?.profile?.name || from;
        const mediaId = extractMediaId(message, msgType);
        const initialBody = buildInitialBody(message, msgType);

        // Process the message
        try {
          await processIncomingMessage({
            workspaceSlug,
            from,
            name,
            msgType,
            wamid,
            timestamp,
            phoneNumberId,
            mediaId,
            body: initialBody,
          });
        } catch (e) {
          log({ level: 'error', msg: 'whatsapp_message_processing_failed', requestId, workspaceSlug, wamid, error: e });
          reportError(e, { route: '/api/integrations/whatsapp/webhook', requestId, workspaceSlug, wamid });
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function processIncomingMessage({ workspaceSlug, from, name, body, msgType, wamid, timestamp, phoneNumberId, mediaId }) {
  // 1. Find Workspace
  const workspace = await prisma.workspace.findFirst({
    where: { slug: workspaceSlug },
  });

  if (!workspace) throw new Error('Workspace not found');

  const integration = await findWhatsAppIntegration(workspace.id, phoneNumberId);
  const accessToken = integration?.credentials?.accessToken ? String(integration.credentials.accessToken) : null;

  // 2. Find or Create Contact
  // We normalize the incoming 'from' (usually just digits) to search for common variations
  const fromDigits = from.replace(/\D/g, '');
  let contact = await prisma.contact.findFirst({
    where: {
      workspaceId: workspace.id,
      OR: [
        { phone: from },
        { phone: `+${from}` },
        { phone: fromDigits },
        { phone: `+${fromDigits}` },
        // Also check if the number in DB starts with country code or not
        { phone: { endsWith: fromDigits.length > 8 ? fromDigits.slice(-8) : fromDigits } }
      ]
    }
  });

  if (!contact) {
    // Create new Contact (Lead)
    contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: name || from, // Use phone number as name if name is missing
        phone: from,
      }
    });
  }

  // 3. Find or Create Conversation
  // Look for an open conversation on WHATSAPP platform
  let conversation = await prisma.conversation.findFirst({
    where: {
      workspaceId: workspace.id,
      contactId: contact.id,
      platform: 'WHATSAPP',
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        contactId: contact.id,
        platform: 'WHATSAPP',
      }
    });
  }

  if (String(msgType || '').toLowerCase() === 'text' && isConsentText(body)) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { mediaProcessingConsentAt: new Date() },
    });
    await createActivity(workspace.id, null, {
      type: 'MEDIA_CONSENT_GRANTED',
      title: 'Media consent granted',
      content: JSON.stringify({ conversationId: conversation.id }),
      contactId: contact.id,
    });
  }

  // 4. Create Message using the service to trigger notifications and updates
  let message = await createMessage(conversation.id, {
    direction: 'INBOUND',
    type: toMessageType(msgType),
    content: body,
    mediaUrl: mediaId ? `whatsapp:media:${mediaId}` : null,
    externalId: wamid,
    status: 'RECEIVED',
  });

  // 5. Fetch updated conversation (already updated by createMessage)
  conversation = await prisma.conversation.findUnique({
    where: { id: conversation.id }
  });

  const shouldAttemptProcessing = Boolean(mediaId && accessToken);
  if (shouldAttemptProcessing) {
    const googleAiApiKey = await getSystemConfig('GOOGLE_AI_API_KEY', process.env.GOOGLE_AI_API_KEY);
    const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
    const typeLower = String(msgType || '').toLowerCase();
    const isAudio = typeLower === 'audio';
    const isImage = typeLower === 'image';
    const isDocument = typeLower === 'document';

    const consentOk = Boolean(
      conversation?.mediaProcessingConsentAt &&
      (Date.now() - new Date(conversation.mediaProcessingConsentAt).getTime()) < 24 * 60 * 60_000
    );

    const maxAudioBytes = 15 * 1024 * 1024;
    const maxImageBytes = 8 * 1024 * 1024;
    const maxDocumentBytes = 6 * 1024 * 1024;

    if ((isAudio || isImage) && !openAiApiKey && !googleAiApiKey) {
      await createActivity(workspace.id, null, {
        type: 'MEDIA_PROCESSING_SKIPPED',
        title: 'Media processing skipped',
        content: JSON.stringify({ reason: 'missing_ai_keys', conversationId: conversation.id, msgType }),
        contactId: contact.id,
      });
    } else if (isDocument && !consentOk) {
      await createActivity(workspace.id, null, {
        type: 'MEDIA_CONSENT_REQUIRED',
        title: 'Media consent required',
        content: JSON.stringify({ conversationId: conversation.id, msgType: 'document' }),
        contactId: contact.id,
      });
      await prisma.message.update({
        where: { id: message.id },
        data: { content: '[Document] (extração pendente de consentimento)' },
      });
      message = { ...message, content: '[Document] (extração pendente de consentimento)' };
    } else {
      try {
        const meta = await fetchWhatsAppMediaMetadata({ accessToken, mediaId });
        const url = String(meta?.url || '');
        const mimeType = String(meta?.mime_type || '').trim() || null;
        const fileSize = Number(meta?.file_size || 0);

        if (!url) throw new Error('media_url_missing');

        if (isAudio) {
          const maxBytes = maxAudioBytes;
          if (Number.isFinite(fileSize) && fileSize > 0 && fileSize > maxBytes) throw new Error('media_too_large');
          const bytes = await downloadWhatsAppMedia({ accessToken, url, maxBytes });
          const transcript = await transcribeAudio({ openAiApiKey, audioBytes: bytes, mimeType });
          if (transcript) {
            const content = clampText(transcript, 2000);
            message = await prisma.message.update({
              where: { id: message.id },
              data: { content, type: 'TEXT' },
            });
            await createActivity(workspace.id, null, {
              type: 'AUDIO_TRANSCRIBED',
              title: 'Audio transcribed',
              content: JSON.stringify({ conversationId: conversation.id, messageId: message.id }),
              contactId: contact.id,
            });
          }
        }

        if (isImage && !consentOk) {
          await createActivity(workspace.id, null, {
            type: 'MEDIA_CONSENT_REQUIRED',
            title: 'Media consent required',
            content: JSON.stringify({ conversationId: conversation.id, msgType: 'image' }),
            contactId: contact.id,
          });
          const next = clampText(body || '[Image]', 2000);
          await prisma.message.update({
            where: { id: message.id },
            data: { content: next === '[Image]' ? '[Image] (extração pendente de consentimento)' : next },
          });
          message = { ...message, content: next === '[Image]' ? '[Image] (extração pendente de consentimento)' : next };
        } else if (isImage && consentOk) {
          const maxBytes = maxImageBytes;
          if (Number.isFinite(fileSize) && fileSize > 0 && fileSize > maxBytes) throw new Error('media_too_large');
          const bytes = await downloadWhatsAppMedia({ accessToken, url, maxBytes });
          const extracted = await extractImageText({ openAiApiKey, imageBytes: bytes, mimeType });
          if (extracted) {
            const content = clampText(extracted, 2000);
            message = await prisma.message.update({
              where: { id: message.id },
              data: { content, type: 'TEXT' },
            });
            await createActivity(workspace.id, null, {
              type: 'IMAGE_TEXT_EXTRACTED',
              title: 'Image text extracted',
              content: JSON.stringify({ conversationId: conversation.id, messageId: message.id }),
              contactId: contact.id,
            });
          }
        }

        if (isDocument) {
          const maxBytes = maxDocumentBytes;
          if (Number.isFinite(fileSize) && fileSize > 0 && fileSize > maxBytes) throw new Error('media_too_large');
          const bytes = await downloadWhatsAppMedia({ accessToken, url, maxBytes });

          const mt = String(mimeType || '').trim().toLowerCase();
          const canExtractAsText = mt.startsWith('text/') || mt === 'application/json' || mt === 'application/xml';

          if (!canExtractAsText) {
            await createActivity(workspace.id, null, {
              type: 'DOCUMENT_EXTRACTION_SKIPPED',
              title: 'Document extraction skipped',
              content: JSON.stringify({ conversationId: conversation.id, messageId: message.id, mimeType: mt || null }),
              contactId: contact.id,
            });
            await prisma.message.update({
              where: { id: message.id },
              data: { content: clampText(`${body || '[Document]'} (tipo não suportado para extração)`, 2000) },
            });
          } else {
            const extracted = bytes.toString('utf8').replace(/\u0000/g, '').trim();
            if (extracted) {
              const content = clampText(extracted, 2000);
              message = await prisma.message.update({
                where: { id: message.id },
                data: { content, type: 'TEXT' },
              });
              await createActivity(workspace.id, null, {
                type: 'DOCUMENT_TEXT_EXTRACTED',
                title: 'Document text extracted',
                content: JSON.stringify({ conversationId: conversation.id, messageId: message.id, mimeType: mt || null }),
                contactId: contact.id,
              });
            } else {
              await prisma.message.update({
                where: { id: message.id },
                data: { content: clampText(`${body || '[Document]'} (sem texto legível)`, 2000) },
              });
            }
          }
        }
      } catch (error) {
        const reason = String(error?.message || 'unknown_error');
        const isTooLarge = reason === 'media_too_large';
        await createActivity(workspace.id, null, {
          type: 'MEDIA_PROCESSING_FAILED',
          title: 'Media processing failed',
          content: JSON.stringify({ conversationId: conversation.id, msgType, reason }),
          contactId: contact.id,
        });
        if (isTooLarge) {
          await prisma.message.update({
            where: { id: message.id },
            data: { content: clampText(`${body || `[${msgType}]`} (arquivo muito grande para processar)`, 2000) },
          });
        }
      }
    }
  }

  // 6. Trigger Automation
  try {
    await processAutomation(workspace.id, 'INCOMING_MESSAGE', {
      contact,
      conversation,
      message,
    });
  } catch (err) {
    log({
      level: 'error',
      msg: 'automation_incoming_message_failed',
      requestId: null,
      workspaceId: workspace.id,
      conversationId: conversation.id,
      messageId: message.id,
      error: err,
    });
    reportError(err, { route: 'automation:INCOMING_MESSAGE', workspaceId: workspace.id, conversationId: conversation.id, messageId: message.id });
  }

  // 7. Autopilot Auto-Reply (AI Chatbot)
  if (conversation.autopilotEnabled) {
    processAutopilotReply({ workspace, conversation, contact, message }).catch((err) => {
      log({
        level: 'error',
        msg: 'autopilot_reply_processing_failed',
        workspaceId: workspace.id,
        conversationId: conversation.id,
        messageId: message.id,
        error: err,
      });
      reportError(err, {
        route: 'autopilot:processIncomingMessage',
        workspaceId: workspace.id,
        conversationId: conversation.id,
        messageId: message.id,
      });
    });
  }
}
