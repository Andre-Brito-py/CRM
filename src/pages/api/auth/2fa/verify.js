import { TOTP } from 'otplib';
import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '16kb',
        },
    },
};

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
    }

    const session = await validateSession(req, res);
    if (!session) return;
    const requestId = String(req.headers['x-request-id'] || '').trim() || null;

    const { token, enable } = req.body;

    if (!token) {
        return res.status(400).json({ error: { msg: 'Token is required' } });
    }

    try {
        const userId = session.user.userId || session.user.id;
        const rl = await rateLimit({ req, limit: 20, windowMs: 5 * 60_000, key: `u:${userId}:2fa:verify` });
        if (!rl.ok) {
            log({ level: 'warn', msg: 'auth_2fa_verify_rate_limited', requestId, userId });
            return res.status(429).json({ error: { msg: 'Too Many Requests' } });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ error: { msg: '2FA is not setup for this user' } });
        }

        const totp = new TOTP();
        const isValid = await totp.verify(token, { secret: user.twoFactorSecret });

        if (!isValid) {
            return res.status(400).json({ error: { msg: 'Invalid authentication code' } });
        }

        // Toggle 2FA state based on the request (enable/disable)
        if (enable !== undefined) {
            await prisma.user.update({
                where: { id: user.id },
                data: { twoFactorEnabled: enable }
            });
        }

        res.status(200).json({ data: { success: true, enabled: enable } });
    } catch (error) {
        log({ level: 'error', msg: 'auth_2fa_verify_failed', requestId, userId: session.user.userId, error });
        reportError(error, { route: '/api/auth/2fa/verify', requestId, userId: session.user.userId });
        res.status(500).json({ error: { msg: 'Failed to verify token' } });
    }
};

export default handler;
