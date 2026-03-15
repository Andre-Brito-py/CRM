import crypto from 'crypto';

import prisma from '@/prisma/index';
import { createConversation, createMessage } from '@/prisma/services/conversation';
import { processAutomation } from '@/prisma/services/automation';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

const extractEmail = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const m = raw.match(/<([^>]+)>/);
  const email = (m?.[1] || raw).trim().toLowerCase();
  if (!email || !email.includes('@')) return null;
  return email;
};

const normalizeSubject = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/^(re|fw|fwd)\s*:\s*/i, '').trim().toLowerCase();
};

const stripHtml = (value) => {
  const raw = String(value || '');
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
};

const computeThreadId = ({ fromEmail, toEmail, subject, messageId, inReplyTo, references, provided }) => {
  const maybe = String(provided || '').trim();
  if (maybe) return maybe;

  const replyTo = String(inReplyTo || '').trim();
  if (replyTo) return replyTo;

  const refs = Array.isArray(references) ? references.join(' ') : String(references || '');
  const refsClean = refs.trim();
  if (refsClean) {
    const parts = refsClean.split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }

  const mid = String(messageId || '').trim();
  if (mid) return mid;

  const base = `${fromEmail || ''}|${toEmail || ''}|${normalizeSubject(subject)}`;
  const hash = crypto.createHash('sha256').update(base).digest('hex').slice(0, 24);
  return `email_${hash}`;
};

export default async function handler(req, res) {
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
  }

  const rl = await rateLimit({ req, limit: 120, windowMs: 60_000, key: `email:inbound:${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'ip'}` });
  if (!rl.ok) {
    return res.status(429).json({ error: { msg: 'Too Many Requests' } });
  }

  const workspaceSlug = String(req.query?.workspace || '').trim();
  if (!workspaceSlug) {
    return res.status(400).json({ error: { msg: 'workspace is required' } });
  }

  const providedToken =
    String(req.headers['x-email-inbound-token'] || '').trim() ||
    String(req.headers['x-inbound-email-token'] || '').trim() ||
    String(req.query?.token || '').trim();

  if (!providedToken) {
    return res.status(401).json({ error: { msg: 'Missing token' } });
  }

  try {
    const workspace = await prisma.workspace.findFirst({
      where: { slug: workspaceSlug, deletedAt: null },
      select: { id: true, slug: true },
    });

    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    const integration = await prisma.integration.findFirst({
      where: { workspaceId: workspace.id, provider: 'EMAIL', enabled: true },
      select: { id: true, enabled: true, credentials: true },
    });

    const expectedToken = integration?.credentials?.inboundToken ? String(integration.credentials.inboundToken) : null;
    if (!expectedToken || expectedToken !== providedToken) {
      return res.status(403).json({ error: { msg: 'Forbidden' } });
    }

    const fromEmail = extractEmail(req.body?.from);
    const toEmail = extractEmail(req.body?.to);
    const subject = String(req.body?.subject || '').trim();
    const messageId = String(req.body?.messageId || req.body?.message_id || '').trim() || null;
    const inReplyTo = String(req.body?.inReplyTo || req.body?.in_reply_to || '').trim() || null;
    const references = req.body?.references || null;
    const providedThreadId = req.body?.threadId || req.body?.thread_id || null;

    const textRaw = String(req.body?.text || '').trim();
    const htmlRaw = String(req.body?.html || '').trim();
    const bodyText = textRaw || stripHtml(htmlRaw);

    if (!fromEmail || !bodyText) {
      return res.status(400).json({ error: { msg: 'from and text/html are required' } });
    }

    let contact = await prisma.contact.findFirst({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        email: { equals: fromEmail, mode: 'insensitive' },
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          name: String(req.body?.fromName || '').trim() || fromEmail,
          email: fromEmail,
        },
      });
    }

    const threadId = computeThreadId({
      fromEmail,
      toEmail,
      subject,
      messageId,
      inReplyTo,
      references,
      provided: providedThreadId,
    });

    let conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId: workspace.id,
        contactId: contact.id,
        platform: 'EMAIL',
        externalId: threadId,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await createConversation(workspace.id, {
        contactId: contact.id,
        platform: 'EMAIL',
        externalId: threadId,
      });
    }

    const content = subject ? `Assunto: ${subject}\n\n${bodyText}` : bodyText;

    const message = await createMessage(conversation.id, {
      direction: 'INBOUND',
      type: 'EMAIL',
      content,
      mediaUrl: null,
      status: 'RECEIVED',
      externalId: messageId,
    });

    try {
      await processAutomation(workspace.id, 'INCOMING_MESSAGE', {
        contact,
        conversation,
        message,
      });
    } catch (error) {
      log({ level: 'error', msg: 'email_incoming_message_automation_failed', requestId, workspaceId: workspace.id, conversationId: conversation.id, messageId: message.id, error });
      reportError(error, { route: 'automation:INCOMING_MESSAGE', requestId, workspaceId: workspace.id, conversationId: conversation.id, messageId: message.id });
    }

    res.status(200).json({ data: { ok: true } });
  } catch (error) {
    log({ level: 'error', msg: 'email_inbound_failed', requestId, error });
    reportError(error, { route: '/api/integrations/email/inbound', requestId });
    res.status(500).json({ error: { msg: 'Inbound email processing failed' } });
  }
}

