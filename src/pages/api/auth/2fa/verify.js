import { authenticator } from 'otplib';
import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '16kb',
        },
    },
};

const handler = async (req, res) => {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: { msg: 'Method Unsupported' } });
        }

        const session = await validateSession(req, res);
        if (!session) return;
        const requestId = String(req.headers['x-request-id'] || '').trim() || null;
        const userId = session.user?.userId || session.user?.id;

        const { token, enable } = req.body;

        if (!token) {
            return res.status(400).json({ error: { msg: 'Token is required' } });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ error: { msg: '2FA setup not found for user' } });
        }

        // Verify token
        const isValid = authenticator.verify({
            token,
            secret: user.twoFactorSecret
        });

        if (!isValid) {
            return res.status(400).json({ error: { msg: 'Invalid authentication code' } });
        }

        // Update 2FA status
        if (enable !== undefined) {
            await prisma.user.update({
                where: { id: userId },
                data: { twoFactorEnabled: enable }
            });
        }

        return res.status(200).json({ data: { success: true, enabled: enable } });
    } catch (error) {
        console.error('[2FA VERIFY ERROR]:', error);
        log({ level: 'error', msg: 'auth_2fa_verify_failed', userId: session?.user?.id, error: error.message });
        return res.status(500).json({ error: { msg: 'Failed to verify 2FA token', detail: error.message } });
    }
};

export default handler;
