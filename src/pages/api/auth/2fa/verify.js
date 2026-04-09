import { authenticator } from 'otplib';
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
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: { msg: 'Method Unsupported' } });
        }
 
        const session = await validateSession(req, res);
        if (!session) return;
        const requestId = String(req.headers['x-request-id'] || '').trim() || null;
        const userId = session.user?.userId || session.user?.id;
 
        const { token, enable, secret } = req.body;
 
        if (!token) {
            return res.status(400).json({ error: { msg: 'Token is required' } });
        }
 
        // Rate Limit Check
        const rl = await rateLimit({ req, limit: 10, windowMs: 5 * 60_000, key: `auth:2fa:verify:${userId}` });
        if (!rl.ok) {
            return res.status(429).json({ error: { msg: 'Too many attempts. Please wait 5 minutes.' } });
        }
 
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
 
        if (!user) {
            return res.status(404).json({ error: { msg: 'User not found' } });
        }
 
        // Determine which secret to verify AGAINST
        // 1. If user already has 2FA enabled, they MUST prove ownership of the current secret 
        //    before they can change it or disable it.
        if (user.twoFactorEnabled) {
            // Case A: Disabling. The 'token' should be for the current secret.
            // Case B: Changing device. The 'token' is for the NEW secret, so we need 'currentCode' for the OLD one.
            
            if (secret) {
                // Changing device
                const { currentCode } = req.body;
                if (!currentCode) {
                    return res.status(400).json({ error: { msg: 'Current authentication code is required to change settings' } });
                }
                const isCurrentValid = authenticator.verify({
                    token: currentCode,
                    secret: user.twoFactorSecret
                });
                if (!isCurrentValid) {
                    return res.status(400).json({ error: { msg: 'Current authentication code is invalid' } });
                }
            } else {
                // Disabling (secret is not provided, so token is verified against user.twoFactorSecret later)
            }
        }

        const secretToVerify = secret || user.twoFactorSecret;

        if (!secretToVerify) {
            return res.status(400).json({ error: { msg: '2FA setup not found. Please start setup again.' } });
        }

        // Verify token (If changing secret, this is the NEW one. If disabling, this is the CURRENT one)
        const isValid = authenticator.verify({
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
        console.error('[2FA VERIFY ERROR]:', error);
        log({ level: 'error', msg: 'auth_2fa_verify_failed', userId: session?.user?.id, error: error.message });
        return res.status(500).json({ error: { msg: 'Failed to verify 2FA token', detail: error.message } });
    }
};

export default handler;
