import crypto from 'crypto';
import { TOTP, ScureBase32Plugin } from 'otplib';

/**
 * Native Node.js Crypto Bridge for otplib
 * This bypasses the unstable plugin system of otplib v13
 * and hooks directly into Node's native 'crypto' module.
 */
const nativeCrypto = {
    randomBytes: (size) => {
        return crypto.randomBytes(size);
    },
    hmac: (algorithm, secret, message) => {
        const hmac = crypto.createHmac(algorithm, secret);
        hmac.update(message);
        return hmac.digest();
    }
};

/**
 * Creates a pre-configured TOTP instance compatible with Google Authenticator
 */
export const getTotpInstance = () => {
    return new TOTP({
        crypto: nativeCrypto,
        base32: ScureBase32Plugin, // Keeping the base32 plugin as it was working (svg generation succeeded)
        algorithm: 'sha1',
        digits: 6,
        period: 30
    });
};

/**
 * Helper to generate a new 2FA secret
 */
export const generateSecret = () => {
    return getTotpInstance().generateSecret();
};

/**
 * Helper to generate the QR Code URI
 */
export const generateURI = (userEmail, secret) => {
    return getTotpInstance().generateURI({
        issuer: 'Vysify',
        label: userEmail,
        secret
    });
};

/**
 * Helper to verify a token
 */
export const verifyToken = (token, secret) => {
    return getTotpInstance().verify({
        token,
        secret
    });
};
