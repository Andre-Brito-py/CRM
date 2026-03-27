import nodemailer from 'nodemailer';
import { getSystemConfig } from '@/lib/server/config';

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

export const sendMail = async ({ from, headers, html, subject, text, to }) => {
  const defaultFrom = await getSystemConfig('EMAIL_FROM', process.env.EMAIL_FROM);
  const data = {
    from: from ?? defaultFrom,
    to,
    subject,
    text,
    html,
    headers: headers || undefined,
  };

  if (process.env.NODE_ENV === 'production') {
    try {
      const transporter = await getTransporter();
      return await transporter.sendMail(data);
    } catch (err) {
      // If email is not configured, log and skip instead of crashing the caller
      if (err.message && err.message.includes('Email is not configured')) {
        console.warn('[mail] Skipping email send — email provider not configured:', err.message);
        return { messageId: null, accepted: [], rejected: [], skipped: true };
      }
      throw err;
    }
  } else {
    console.log(data);
    return { messageId: null, accepted: [], rejected: [] };
  }
};
