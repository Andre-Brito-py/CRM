import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import isEmail from 'validator/lib/isEmail';

import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';
import { withRateLimit } from '@/lib/server/api-wrapper';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '32kb',
        },
    },
};

const sha256Hex = (value) =>
    crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');

const isStrongEnoughPassword = (raw) => {
    const password = String(raw || '');
    if (password.length < 10) return false;
    if (password.length > 72) return false;
    if (!/[A-Za-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
};

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
    }

    const requestId = String(req.headers['x-request-id'] || '').trim() || null;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const jitterMs = (base, spread) => base + crypto.randomInt(0, spread + 1);

    try {
        const email = req.body?.email ? String(req.body.email) : '';
        const token = req.body?.token ? String(req.body.token) : '';
        const password = req.body?.password ? String(req.body.password) : '';

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !isEmail(normalizedEmail)) {
            await sleep(jitterMs(220, 360));
            return res.status(400).json({ error: { msg: 'Dados inválidos' } });
        }

        if (!token || token.length < 32) {
            await sleep(jitterMs(220, 360));
            return res.status(400).json({ error: { msg: 'Token inválido ou expirado' } });
        }

        if (!isStrongEnoughPassword(password)) {
            return res.status(400).json({
                error: { msg: 'Senha fraca. Use 10+ caracteres com letras e números (máx. 72).' },
            });
        }

        const rlEmail = await rateLimit({
            req,
            limit: 10,
            windowMs: 10 * 60_000,
            key: `auth:reset_password:email:${normalizedEmail}`,
        });
        if (!rlEmail.ok) {
            log({ level: 'warn', msg: 'auth_reset_password_email_rate_limited', requestId });
            await sleep(jitterMs(220, 360));
            return res.status(429).json({ error: { msg: 'Too Many Requests' } });
        }

        const identifier = `password-reset:${normalizedEmail}`;
        const tokenHash = sha256Hex(token);

        const resetToken = await prisma.verificationToken.findFirst({
            where: {
                identifier,
                token: tokenHash,
                expires: { gt: new Date() },
            },
            select: { token: true, identifier: true },
        });

        if (!resetToken) {
            await sleep(jitterMs(220, 360));
            return res.status(400).json({ error: { msg: 'Token inválido ou expirado' } });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const updated = await prisma.user.updateMany({
            where: {
                deletedAt: null,
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive',
                },
            },
            data: {
                password: hashedPassword,
            },
        });

        await prisma.verificationToken.deleteMany({ where: { identifier } });

        if (!updated?.count) {
            await sleep(jitterMs(220, 360));
            return res.status(400).json({ error: { msg: 'Token inválido ou expirado' } });
        }

        return res.status(200).json({ data: { ok: true } });
    } catch (error) {
        log({ level: 'error', msg: 'auth_reset_password_failed', requestId, error });
        reportError(error, { route: '/api/auth/reset-password', requestId });
        return res.status(500).json({ error: { msg: 'Failed to reset password' } });
    }
};

export default withRateLimit(handler, {
    limit: 10,
    windowMs: 5 * 60_000,
    keyPrefix: 'auth:reset-password:'
});
