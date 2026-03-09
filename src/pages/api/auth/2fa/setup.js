import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
    }

    const session = await validateSession(req, res);
    if (!session) return;

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.userId }
        });

        if (!user) {
            return res.status(404).json({ error: { msg: 'User not found' } });
        }

        // Generate secret only if not exists or if explicitly resetting
        let secret = user.twoFactorSecret;
        if (!secret || req.body.reset) {
            secret = authenticator.generateSecret();
            await prisma.user.update({
                where: { id: user.id },
                data: { twoFactorSecret: secret }
            });
        }

        // Generate URI for Google Authenticator
        const userEmail = user.email || 'user@nextacular.com';
        const otpauth = authenticator.keyuri(userEmail, 'Nextacular', secret);

        // Generate QR Code image data URL
        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        res.status(200).json({ data: { qrCodeUrl, secret } });
    } catch (error) {
        console.error('2FA Setup Error:', error);
        res.status(500).json({ error: { msg: 'Failed to setup 2FA' } });
    }
};

export default handler;
