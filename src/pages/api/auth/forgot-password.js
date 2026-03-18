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

const buildEmail = ({ email, resetUrl }) => {
    const safeEmail = String(email || '');
    const safeUrl = String(resetUrl || '');

    return {
        subject: '[Closify] Recuperação de senha',
        text:
            `Recebemos um pedido para redefinir a senha da sua conta (${safeEmail}).\n\n` +
            `Para criar uma nova senha, abra este link:\n${safeUrl}\n\n` +
            `Se você não solicitou isso, ignore este e-mail.`,
        html:
            `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">` +
            `<h2 style="margin: 0 0 12px;">Recuperação de senha</h2>` +
            `<p style="margin: 0 0 16px;">Recebemos um pedido para redefinir a senha da sua conta (${safeEmail}).</p>` +
            `<p style="margin: 0 0 16px;"><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;">Criar nova senha</a></p>` +
            `<p style="margin: 0 0 16px;">Ou copie e cole no navegador:</p>` +
            `<p style="margin: 0 0 16px;"><a href="${safeUrl}">${safeUrl}</a></p>` +
            `<p style="margin: 0; color: #555;">Se você não solicitou isso, ignore este e-mail. O link expira em 1 hora.</p>` +
            `</div>`,
    };
};

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

    const rl = await rateLimit({ req, limit: 30, windowMs: 10 * 60_000 });
    if (!rl.ok) {
        log({ level: 'warn', msg: 'auth_forgot_password_rate_limited', requestId });
        return genericOk();
    }

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

        const mail = buildEmail({ email: normalizedEmail, resetUrl });
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

export default handler;
