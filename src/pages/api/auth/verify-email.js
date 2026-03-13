import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
    }

    const { token, email } = req.query;
    const requestId = String(req.headers['x-request-id'] || '').trim() || null;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const jitterMs = (base, spread) => base + Math.floor(Math.random() * (spread + 1));

    if (!token || !email) {
        return res.status(400).send('Invalid verification request');
    }

    try {
        const rl = await rateLimit({ req, limit: 20, windowMs: 10 * 60_000 });
        if (!rl.ok) {
            log({ level: 'warn', msg: 'auth_verify_email_rate_limited', requestId });
            return res.status(429).send('Too Many Requests');
        }

        const normalizedEmail = String(email || '').trim().toLowerCase();
        const rlEmail = await rateLimit({ req, limit: 10, windowMs: 10 * 60_000, key: `auth:verify-email:${normalizedEmail}` });
        if (!rlEmail.ok) {
            log({ level: 'warn', msg: 'auth_verify_email_email_rate_limited', requestId });
            return res.status(429).send('Too Many Requests');
        }

        const verificationToken = await prisma.verificationToken.findFirst({
            where: {
                identifier: {
                    equals: normalizedEmail,
                    mode: 'insensitive',
                },
                token,
                expires: { gt: new Date() }
            }
        });

        if (!verificationToken) {
            await sleep(jitterMs(250, 450));
            return res.status(400).send('<h1>Invalid or Expired Token</h1><p>Please log in or request a new verification email.</p>');
        }

        await prisma.user.updateMany({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive',
                }
            },
            data: { emailVerified: new Date() }
        });

        await prisma.verificationToken.deleteMany({
            where: {
                identifier: {
                    equals: normalizedEmail,
                    mode: 'insensitive',
                }
            }
        });

        return res.redirect('/auth/login?verified=true');
    } catch (error) {
        log({ level: 'error', msg: 'auth_verify_email_failed', requestId, error });
        reportError(error, { route: '/api/auth/verify-email', requestId });
        return res.status(500).send('An error occurred during verification');
    }
};

export default handler;
