import nodemailer from 'nodemailer';
import { getSystemConfig } from '@/lib/server/config';

export const getTransporter = async () => {
  const user = await getSystemConfig('EMAIL_SERVER_USER', process.env.EMAIL_SERVER_USER);
  const pass = await getSystemConfig('EMAIL_SERVER_PASSWORD', process.env.EMAIL_SERVER_PASSWORD);
  const service = await getSystemConfig('EMAIL_SERVICE', process.env.EMAIL_SERVICE);

  const emailConfig = {
    auth: { user, pass },
    service,
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
    const transporter = await getTransporter();
    return await transporter.sendMail(data);
  } else {
    console.log(data);
    return { messageId: null, accepted: [], rejected: [] };
  }
};
