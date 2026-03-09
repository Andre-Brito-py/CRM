import { authenticator } from 'otplib';
import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
    }

    const session = await validateSession(req, res);
    if (!session) return;

    const { token, enable } = req.body;

    if (!token) {
        return res.status(400).json({ error: { msg: 'Token is required' } });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.userId }
        });

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ error: { msg: '2FA is not setup for this user' } });
        }

        const isValid = authenticator.check(token, user.twoFactorSecret);

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
        console.error('2FA Verify Error:', error);
        res.status(500).json({ error: { msg: 'Failed to verify token' } });
    }
};

export default handler;
