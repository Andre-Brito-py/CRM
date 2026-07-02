import nodemailer from 'nodemailer';
import { getSystemConfig } from '@/lib/server/config';
import prisma from '@/prisma/index';

export const getTransporter = async () => {
  const user = await getSystemConfig('EMAIL_SERVER_USER', process.env.EMAIL_SERVER_USER);
  const pass = await getSystemConfig('EMAIL_SERVER_PASSWORD', process.env.EMAIL_SERVER_PASSWORD);
  const service = await getSystemConfig('EMAIL_SERVICE', process.env.EMAIL_SERVICE);

  const resolvedUser = String(user || '').trim();
  const resolvedService = String(service || '').trim();

  if (!resolvedService || !resolvedUser) {
    throw new Error(
      'Email is not configured. Set EMAIL_SERVICE and EMAIL_SERVER_USER in your environment variables or admin settings.'
    );
  }

  const emailConfig = {
    auth: { user: resolvedUser, pass: String(pass || '') },
    service: resolvedService,
  };

  return nodemailer.createTransport(emailConfig);
};

export const sendMail = async ({ workspaceId, from, headers, html, subject, text, to }) => {
  let transporter;
  let senderEmail = from;
  let inboxRecord = null;

  // 1. Try to find and rotate custom connected email inboxes for the workspace
  if (workspaceId) {
    try {
      const inbox = await prisma.emailInbox.findFirst({
        where: { workspaceId, isActive: true },
        orderBy: [
          { lastUsedAt: 'asc' }, // Select least recently used
          { id: 'asc' }
        ]
      });

      if (inbox) {
        inboxRecord = inbox;
        const creds = typeof inbox.credentials === 'string' ? JSON.parse(inbox.credentials) : inbox.credentials;
        
        if (inbox.provider === 'SMTP') {
          const isSecure = creds.secure === true || String(creds.secure) === 'true';
          transporter = nodemailer.createTransport({
            host: creds.host,
            port: Number(creds.port || 587),
            secure: isSecure,
            auth: {
              user: creds.user,
              pass: creds.pass,
            },
          });
          senderEmail = creds.from || inbox.email;
        } else {
          // OAuth or other custom providers can be added here
          console.warn(`[mail] Provider ${inbox.provider} not fully supported, falling back to SMTP parser.`);
        }
      }
    } catch (err) {
      console.error('[mail] Failed to resolve custom email inbox, falling back to system defaults:', err);
    }
  }

  // 2. Fallback to system transporter if no custom inbox is configured or found
  if (!transporter) {
    const defaultFrom = await getSystemConfig('EMAIL_FROM', process.env.EMAIL_FROM);
    senderEmail = senderEmail ?? defaultFrom;
    try {
      transporter = await getTransporter();
    } catch (err) {
      if (err.message && err.message.includes('Email is not configured')) {
        console.warn('[mail] Skipping email send — email provider not configured:', err.message);
        return { messageId: null, accepted: [], rejected: [], skipped: true };
      }
      throw err;
    }
  }

  const data = {
    from: senderEmail,
    to,
    subject,
    text,
    html,
    headers: headers || undefined,
  };

  try {
    let sendResult;
    if (process.env.NODE_ENV === 'production') {
      sendResult = await transporter.sendMail(data);
    } else {
      console.log('[mail] (Dev Mode Simulation) Dispatching email:', data);
      sendResult = { messageId: `dev-${Date.now()}`, accepted: [to], rejected: [] };
    }

    // 3. Post-send accounting: Update rotation counter for custom inbox
    if (inboxRecord) {
      await prisma.emailInbox.update({
        where: { id: inboxRecord.id },
        data: {
          lastUsedAt: new Date(),
          sentToday: { increment: 1 }
        }
      }).catch(err => console.error('[mail] Error updating email inbox counters:', err));
    }

    return sendResult;
  } catch (err) {
    console.error('[mail] Error sending email:', err);
    throw err;
  }
};
