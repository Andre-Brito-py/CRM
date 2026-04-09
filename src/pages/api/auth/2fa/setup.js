import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import QRCode from 'qrcode';
import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '32kb',
        },
    },
};

const handler = async (req, res) => {
    // Force JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: { msg: 'Method Unsupported' } });
        }

        const session = await validateSession(req, res);
        if (!session) return;
        
        const userId = session.user?.userId || session.user?.id;

        if (!userId) {
            return res.status(401).json({ error: { msg: 'User ID not found in session' } });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true }
        });

        if (!user) {
            return res.status(404).json({ error: { msg: 'User not found in database' } });
        }

        const totp = new TOTP({ 
            crypto: NobleCryptoPlugin, 
            base32: ScureBase32Plugin 
        });
        const secret = totp.generateSecret();
        
        // Ensure email is safe for URI
        const userEmail = encodeURIComponent(user.email || 'user@vysify.com');
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
         
         if (!svgString) {
             throw new Error('Failed to generate QR Code SVG');
         }

         const qrCodeUrl = `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`;
  
         return res.status(200).json({ data: { qrCodeUrl, secret } });
    } catch (error) {
        console.error('[2FA SETUP FATAL ERROR]:', error);
        // DO NOT use internal logger here to avoid cascading failures
        return res.status(500).json({ 
            error: { 
                msg: 'Failed to initiate 2FA setup', 
                detail: error.message,
                code: 'INTERNAL_SERVER_ERROR'
            } 
        });
    }
};

export default handler;
