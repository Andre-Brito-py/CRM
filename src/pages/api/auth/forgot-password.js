import crypto from 'crypto';
import isEmail from 'validator/lib/isEmail';

import prisma from '@/prisma/index';
import { sendMail } from '@/lib/server/mail';
import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '32kb',
        },
    },
};

const sha256Hex = (value) =>
    crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');

const buildBaseUrl = async (req) => {
    const rawAppUrl = await getSystemConfig('APP_URL', process.env.APP_URL);
    const cleaned = String(rawAppUrl || '').trim().replace(/\/+$/, '');
    if (cleaned) return cleaned;

    const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    if (!host) return 'http://localhost:3000';
    return `${proto}://${host}`;
};

const escapeHtml = (value) =>
    String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const buildEmail = ({ email, resetUrl, appUrl }) => {
    const safeEmail = escapeHtml(String(email || '').trim());
    const safeUrl = String(resetUrl || '').trim();
    const safeUrlHtml = escapeHtml(safeUrl);
    const logoUrl = `${appUrl}/images/logo-full.png`;

    return {
        subject: '[Vysify] Recuperação de senha',
        text:
            `Olá!\n\n` +
            `Recebemos um pedido para redefinir a senha da sua conta no Vysify (${String(email || '').trim().toLowerCase()}).\n\n` +
            `Para criar uma nova senha, use este link (válido por 1 hora):\n${safeUrl}\n\n` +
            `Se você não solicitou essa redefinição, ignore este e-mail. Sua senha atual continuará válida.\n\n` +
            `— Equipe Vysify`,
        html:
            `<!doctype html>` +
            `<html lang="pt-BR">` +
            `<head>` +
            `<meta charset="utf-8" />` +
            `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
            `<title>Recuperação de senha</title>` +
            `</head>` +
            `<body style="margin:0;padding:0;background-color:#f8fafc;color:#1e293b;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">` +
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 16px;">` +
            `<tr>` +
            `<td align="center">` +
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,1,0.05),0 2px 4px -2px rgba(0,0,1,0.05);border:1px solid #e2e8f0;">` +
            `<tr>` +
            `<td style="padding:40px 40px 32px 40px;text-align:center;">` +
            `<img src="${logoUrl}" alt="Vysify" width="160" style="display:block;margin:0 auto;height:auto;border:0;" />` +
            `</td>` +
            `</tr>` +
            `<tr>` +
            `<td style="padding:0 40px 24px 40px;">` +
            `<div style="font-size:24px;font-weight:700;color:#0f172a;margin-bottom:16px;">Recuperação de senha</div>` +
            `<div style="font-size:16px;line-height:24px;color:#475569;">` +
            `<p style="margin:0 0 16px 0;">Olá,</p>` +
            `<p style="margin:0 0 16px 0;">Recebemos uma solicitação para redefinir a senha associada à conta <strong>${safeEmail}</strong> no Vysify.</p>` +
            `<p style="margin:0 0 24px 0;">Para escolher uma nova senha, clique no botão abaixo. Este link expira em <strong>1 hora</strong> por motivos de segurança.</p>` +
            `</div>` +
            `</td>` +
            `</tr>` +
            `<tr>` +
            `<td style="padding:0 40px 40px 40px;">` +
            `<a href="${safeUrlHtml}" style="display:inline-block;padding:14px 28px;background-color:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;text-align:center;box-shadow:0 10px 15px -3px rgba(79,70,229,0.3);">Redefinir minha senha</a>` +
            `</td>` +
            `</tr>` +
            `<tr>` +
            `<td style="padding:0 40px 40px 40px;">` +
            `<div style="font-size:14px;line-height:20px;color:#64748b;border-top:1px solid #f1f5f9;padding-top:24px;">` +
            `<p style="margin:0 0 12px 0;">Se o botão não funcionar, você pode copiar e colar este link no seu navegador:</p>` +
            `<p style="margin:0 0 0 0;word-break:break-all;"><a href="${safeUrlHtml}" style="color:#4f46e5;text-decoration:none;">${safeUrlHtml}</a></p>` +
            `</div>` +
            `</td>` +
            `</tr>` +
            `<tr>` +
            `<td style="padding:32px 40px;background-color:#f8fafc;border-bottom-left-radius:16px;border-bottom-right-radius:16px;border-top:1px solid #f1f5f9;">` +
            `<div style="font-size:14px;line-height:20px;color:#94a3b8;">` +
            `<p style="margin:0 0 8px 0;"><strong>Não solicitou esta alteração?</strong> Você pode ignorar este e-mail com segurança. Sua senha não será alterada até que você clique no link acima.</p>` +
            `<p style="margin:0;">— Equipe Vysify</p>` +
            `</div>` +
            `</td>` +
            `</tr>` +
            `</table>` +
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">` +
            `<tr>` +
            `<td style="padding:24px 0;text-align:center;font-size:12px;color:#94a3b8;">` +
            `Vysify &bull; CRM &bull; Inbox &bull; Automação` +
            `</td>` +
            `</tr>` +
            `</table>` +
            `</td>` +
            `</tr>` +
            `</table>` +
            `</body>` +
            `</html>`,
    };
};

import { withRateLimit } from '@/lib/server/api-wrapper';

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
    }

    const requestId = String(req.headers['x-request-id'] || '').trim() || null;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const jitterMs = (base, spread) => base + crypto.randomInt(0, spread + 1);

    const genericOk = async () => {
        await sleep(jitterMs(180, 260));
        return res.status(200).json({
            data: {
                ok: true,
                message: 'Se existir uma conta com este e-mail, enviaremos um link de recuperação.',
            },
        });
    };

    try {
        const email = req.body?.email ? String(req.body.email) : '';
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !isEmail(normalizedEmail)) {
            return genericOk();
        }

        const rlEmail = await rateLimit({
            req,
            limit: 5,
            windowMs: 15 * 60_000,
            key: `auth:forgot_password:email:${normalizedEmail}`,
        });
        if (!rlEmail.ok) {
            log({ level: 'warn', msg: 'auth_forgot_password_email_rate_limited', requestId });
            return genericOk();
        }

        const user = await prisma.user.findFirst({
            where: {
                deletedAt: null,
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive',
                },
            },
            select: { id: true, email: true, password: true },
        });

        if (!user?.email || !user.password) {
            return genericOk();
        }

        const baseUrl = await buildBaseUrl(req);
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = sha256Hex(rawToken);
        const identifier = `password-reset:${normalizedEmail}`;
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        await prisma.verificationToken.deleteMany({ where: { identifier } });
        await prisma.verificationToken.create({
            data: {
                identifier,
                token: tokenHash,
                expires,
            },
        });

        const resetUrl =
            `${baseUrl}/auth/reset-password?email=${encodeURIComponent(normalizedEmail)}` +
            `&token=${encodeURIComponent(rawToken)}`;

        const mail = buildEmail({ email: normalizedEmail, resetUrl, appUrl: baseUrl });
        await sendMail({
            to: normalizedEmail,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
        });

        return genericOk();
    } catch (error) {
        log({ level: 'error', msg: 'auth_forgot_password_failed', requestId, error });
        reportError(error, { route: '/api/auth/forgot-password', requestId });
        return res.status(200).json({
            data: {
                ok: true,
                message: 'Se existir uma conta com este e-mail, enviaremos um link de recuperação.',
            },
        });
    }
};

export default withRateLimit(handler, { 
    limit: 15, 
    windowMs: 15 * 60_000, 
    keyPrefix: 'auth:forgot-password:' 
});
