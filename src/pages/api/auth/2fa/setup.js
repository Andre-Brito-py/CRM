import { TOTP } from 'otplib';
import QRCode from 'qrcode';
import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '32kb',
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

    try {
        const userId = session.user.userId || session.user.id;
        const rl = await rateLimit({ req, limit: 10, windowMs: 60_000, key: `u:${userId}:2fa:setup` });
        if (!rl.ok) {
            log({ level: 'warn', msg: 'auth_2fa_setup_rate_limited', requestId, userId });
            return res.status(429).json({ error: { msg: 'Too Many Requests' } });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: { msg: 'User not found' } });
        }

        if (user.twoFactorEnabled && !req.body?.reset) {
            return res.status(400).json({ error: { msg: '2FA is already enabled' } });
        }

        const totp = new TOTP();

        // Generate secret only if not exists or if explicitly resetting
        let secret = user.twoFactorSecret;
        if (!secret || req.body.reset) {
            secret = totp.generateSecret();
            await prisma.user.update({
                where: { id: user.id },
                data: { twoFactorSecret: secret }
            });
        }

        // Generate URI for Google Authenticator
        const userEmail = user.email || 'user@vysify.com';
        const otpauth = totp.toURI({ issuer: 'Vysify', label: userEmail, secret });

        // Generate QR Code as SVG to avoid Canvas native binding crashes on Vercel
        const svgString = await QRCode.toString(otpauth, { type: 'svg' });
        const qrCodeUrl = `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`;

        res.status(200).json({ data: { qrCodeUrl } });
    } catch (error) {
        log({ level: 'error', msg: 'auth_2fa_setup_failed', requestId, userId: session.user.userId, error });
        reportError(error, { route: '/api/auth/2fa/setup', requestId, userId: session.user.userId });
        res.status(500).json({ error: { msg: 'Failed to setup 2FA' } });
    }
};

export default handler;
