import crypto from 'crypto';
import { TOTP } from 'otplib';

/**
 * Manual Base32 implementation (RFC 4648)
 * This eliminates the need for external Base32 plugins that fail on Vercel.
 */
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const nativeBase32 = {
    encode: (input) => {
        const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
        let bits = 0;
        let value = 0;
        let output = '';
        for (let i = 0; i < buffer.length; i++) {
            value = (value << 8) | buffer[i];
            bits += 8;
            while (bits >= 5) {
                output += alphabet[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }
        if (bits > 0) {
            output += alphabet[(value << (5 - bits)) & 31];
        }
        return output;
    },
    decode: (input) => {
        // Simple decode for verification if needed
        const cleanedInput = input.toUpperCase().replace(/=+$/, '');
        let bits = 0;
        let value = 0;
        const output = [];
        for (let i = 0; i < cleanedInput.length; i++) {
            const idx = alphabet.indexOf(cleanedInput[i]);
            if (idx === -1) continue;
            value = (value << 5) | idx;
            bits += 5;
            if (bits >= 8) {
                output.push((value >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }
        return Buffer.from(output);
    }
};

/**
 * Native Node.js Crypto Bridge for otplib
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
 * Creates a pre-configured TOTP instance compatible with Google Authenticator.
 * We ONLY use TOTP from otplib and provide all core logic manually.
 */
export const getTotpInstance = () => {
    return new TOTP({
        crypto: nativeCrypto,
        base32: nativeBase32,
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
