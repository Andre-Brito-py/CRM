import { TOTP } from 'otplib';
import QRCode from 'qrcode';
import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '32kb',
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

        if (!userId) {
            throw new Error('User ID not found in session');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: { msg: 'User not found' } });
        }

        // Generate a new secret for setup
        // We don't save it to user.twoFactorSecret yet to avoid breaking current 2FA
        // The verify.js endpoint will commit it once the user proves they have it configured.
        const totp = new TOTP();
        const secret = totp.generateSecret();
        
        const userEmail = user.email || 'user@vysify.com';
        const otpauth = totp.generateURI({
            issuer: 'Vysify',
            label: userEmail,
            secret
        });
 
         if (!otpauth) {
             throw new Error('Failed to generate OTPAuth URI');
         }
 
         // Generate QR Code as SVG
         const svgString = await QRCode.toString(otpauth, { type: 'svg' });
         const qrCodeUrl = `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`;
 
         return res.status(200).json({ data: { qrCodeUrl, secret } });
    } catch (error) {
        console.error('[2FA SETUP ERROR]:', error);
        log({ level: 'error', msg: 'auth_2fa_setup_failed', userId: session?.user?.id, error: error.message });
        return res.status(500).json({ error: { msg: 'Failed to initiate 2FA setup', detail: error.message } });
    }
};

export default handler;
