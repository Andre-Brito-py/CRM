import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '16kb',
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
        const { token, enable, secret } = req.body;

        if (!token) {
            return res.status(400).json({ error: { msg: 'Token is required' } });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: { msg: 'User not found' } });
        }

        // Determine which secret to verify AGAINST
        if (user.twoFactorEnabled && enable === true && secret) {
            // Changing device: MUST provide current code
            const { currentCode } = req.body;
            if (!currentCode) {
                return res.status(400).json({ error: { msg: 'Current authentication code is required to change settings' } });
            }
            const totp = new TOTP({ 
                crypto: NobleCryptoPlugin, 
                base32: ScureBase32Plugin 
            });
            const isCurrentValid = totp.verify({
                token: currentCode,
                secret: user.twoFactorSecret
            });
            if (!isCurrentValid) {
                return res.status(400).json({ error: { msg: 'Current authentication code is invalid' } });
            }
        }

        const secretToVerify = secret || user.twoFactorSecret;

        if (!secretToVerify) {
            return res.status(400).json({ error: { msg: '2FA setup not found. Please start setup again.' } });
        }

        // Verify token (If changing secret, this is the NEW one. If disabling, this is the CURRENT one)
        const currentTotp = new TOTP({ 
            crypto: NobleCryptoPlugin, 
            base32: ScureBase32Plugin 
        });
        const isValid = currentTotp.verify({
            token,
            secret: secretToVerify
        });

        if (isValid !== true) {
            return res.status(400).json({ error: { msg: 'Invalid authentication code' } });
        }

        // Create update payload
        const updateData = {};

        // If a new secret was verified, save it
        if (secret) {
            updateData.twoFactorSecret = secret;
        }

        // Update 2FA status
        if (enable !== undefined) {
            updateData.twoFactorEnabled = enable;

            // Generate backup codes if being enabled for the first time OR secret is new
            const hasBackupCodes = user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0;
            if (enable === true && (!hasBackupCodes || secret)) {
                const codes = Array.from({ length: 10 }, () =>
                    Math.random().toString(36).substring(2, 10).toUpperCase()
                );
                updateData.twoFactorBackupCodes = codes;
                
                await prisma.user.update({
                    where: { id: userId },
                    data: updateData
                });

                return res.status(200).json({
                    data: {
                        success: true,
                        enabled: true,
                        backupCodes: codes
                    }
                });
            }
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
                where: { id: userId },
                data: updateData
            });
        }

        return res.status(200).json({ data: { success: true, enabled: enable } });
    } catch (error) {
        console.error('[2FA VERIFY FATAL ERROR]:', error);
        return res.status(500).json({ 
            error: { 
                msg: 'Failed to verify 2FA token', 
                detail: error.message,
                code: 'INTERNAL_SERVER_ERROR'
            } 
        });
    }
};

export default handler;
