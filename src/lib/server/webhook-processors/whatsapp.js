/**
 * lib/server/webhook-processors/whatsapp.js
 *
 * Contains the pure business-logic for processing a single inbound WhatsApp
 * webhook event. This function is called by the async worker after the
 * webhook route has already returned 200 OK to the Meta servers.
 *
 * The payload shape expected here is the same object that was originally
 * received in req.body on the webhook route.
 */

import prisma from '@/prisma/index';
import { processAutomation } from '@/prisma/services/automation';
import { createActivity } from '@/prisma/services/activity';
import { createMessage } from '@/prisma/services/conversation';
import { log, reportError } from '@/lib/server/logger';
import { getSystemConfig } from '@/lib/server/config';
import { processAutopilotReply } from '@/lib/server/autopilot';
import { normalizeWhatsAppNumber } from '@/lib/server/phone';

const clampText = (value, max) => {
  const s = String(value ?? '');
  return s.length <= max ? s : s.slice(0, max);
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
    const resp = await fetch(`https://graph.facebook.com/v25.0/${encodeURIComponent(mediaId)}`, {
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

const transcribeAudio = async ({ audioBytes, mimeType }) => {
  const { transcribeAudio: aiTranscribe } = await import('@/lib/server/ai/index');
  try {
    return await aiTranscribe({ audioBytes, mimeType });
  } catch (error) {
    log({ level: 'error', msg: 'whatsapp_ai_transcription_failed', error: error.message });
    throw error;
  }
};

const extractImageText = async ({ imageBytes, mimeType }) => {
  const { extractTextFromImage } = await import('@/lib/server/ai/index');
  try {
    return await extractTextFromImage({ imageBytes, mimeType });
  } catch (error) {
    log({ level: 'error', msg: 'whatsapp_ai_vision_failed', error: error.message });
    throw error;
  }
};

/**
 * Main entry point called by the async worker.
 * @param {object} payload - The full req.body received from the Meta webhook.
 */
export async function processIncomingWhatsAppEvent(payload) {
  const { workspaceSlug, body } = payload;

  if (
    !body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  ) {
    // Not a message event (e.g. status update) — safely skip
    return;
  }

  const value = body.entry[0].changes[0].value;
  const message = value.messages[0];
  const phoneNumberId = value?.metadata?.phone_number_id || null;
  const from = message?.from;
  const msgType = message?.type;
  const wamid = message?.id;
  const timestamp = message?.timestamp;
  const name = value?.contacts?.[0]?.profile?.name || from;
  const mediaId = extractMediaId(message, msgType);
  const initialBody = buildInitialBody(message, msgType);

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
}

async function processIncomingMessage({ workspaceSlug, from, name, body, msgType, wamid, timestamp, phoneNumberId, mediaId }) {
  // 1. Find Workspace
  const workspace = await prisma.workspace.findFirst({
    where: { slug: workspaceSlug },
  });
  if (!workspace) throw new Error(`Workspace not found: ${workspaceSlug}`);

  const integration = await findWhatsAppIntegration(workspace.id, phoneNumberId);
  const accessToken = integration?.credentials?.accessToken ? String(integration.credentials.accessToken) : null;

  // 2. Find or Create Contact
  const { clean, variations } = normalizeWhatsAppNumber(from);

  let contact = await prisma.contact.findFirst({
    where: {
      workspaceId: workspace.id,
      OR: [
        ...variations.map((v) => ({ phone: v })),
        { phone: { endsWith: clean.length > 8 ? clean.slice(-8) : clean } },
      ],
    },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: { workspaceId: workspace.id, name: name || from, phone: clean },
    });
  }

  // 3. Find or Create Conversation
  let conversation = await prisma.conversation.findFirst({
    where: { workspaceId: workspace.id, contactId: contact.id, platform: 'WHATSAPP' },
    orderBy: { updatedAt: 'desc' },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { workspaceId: workspace.id, contactId: contact.id, platform: 'WHATSAPP' },
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

  // 4. Create Message
  let message = await createMessage(conversation.id, {
    direction: 'INBOUND',
    type: toMessageType(msgType),
    content: body,
    mediaUrl: mediaId ? `whatsapp:media:${mediaId}` : null,
    externalId: wamid,
    status: 'RECEIVED',
  });

  // 5. Refresh conversation state
  conversation = await prisma.conversation.findUnique({ where: { id: conversation.id } });

  // 6. Media processing (AI transcription / OCR)
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
        Date.now() - new Date(conversation.mediaProcessingConsentAt).getTime() < 24 * 60 * 60_000
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
          if (Number.isFinite(fileSize) && fileSize > 0 && fileSize > maxAudioBytes) throw new Error('media_too_large');
          const bytes = await downloadWhatsAppMedia({ accessToken, url, maxBytes: maxAudioBytes });
          const transcript = await transcribeAudio({ audioBytes: bytes, mimeType });
          if (transcript) {
            const content = clampText(transcript, 2000);
            message = await prisma.message.update({ where: { id: message.id }, data: { content, type: 'TEXT' } });
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
          if (Number.isFinite(fileSize) && fileSize > 0 && fileSize > maxImageBytes) throw new Error('media_too_large');
          const bytes = await downloadWhatsAppMedia({ accessToken, url, maxBytes: maxImageBytes });
          const extracted = await extractImageText({ imageBytes: bytes, mimeType });
          if (extracted) {
            const content = clampText(extracted, 2000);
            message = await prisma.message.update({ where: { id: message.id }, data: { content, type: 'TEXT' } });
            await createActivity(workspace.id, null, {
              type: 'IMAGE_TEXT_EXTRACTED',
              title: 'Image text extracted',
              content: JSON.stringify({ conversationId: conversation.id, messageId: message.id }),
              contactId: contact.id,
            });
          }
        }

        if (isDocument) {
          if (Number.isFinite(fileSize) && fileSize > 0 && fileSize > maxDocumentBytes) throw new Error('media_too_large');
          const bytes = await downloadWhatsAppMedia({ accessToken, url, maxBytes: maxDocumentBytes });
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
              message = await prisma.message.update({ where: { id: message.id }, data: { content, type: 'TEXT' } });
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

  // 7. Trigger Automation
  try {
    await processAutomation(workspace.id, 'INCOMING_MESSAGE', { contact, conversation, message });
  } catch (err) {
    log({
      level: 'error',
      msg: 'automation_incoming_message_failed',
      workspaceId: workspace.id,
      conversationId: conversation.id,
      messageId: message.id,
      error: err,
    });
    reportError(err, { route: 'automation:INCOMING_MESSAGE', workspaceId: workspace.id });
  }

  // 8. Autopilot (AI Chatbot)
  if (conversation.autopilotEnabled) {
    processAutopilotReply({ workspace, conversation, contact, message }).catch((err) => {
      log({
        level: 'error',
        msg: 'autopilot_reply_processing_failed',
        workspaceId: workspace.id,
        conversationId: conversation.id,
        error: err,
      });
      reportError(err, { route: 'autopilot:processIncomingMessage', workspaceId: workspace.id });
    });
  }
}
