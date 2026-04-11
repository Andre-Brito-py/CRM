import { TOTP, authenticator } from 'otplib';
import crypto from 'crypto';

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

const nativeCrypto = {
    randomBytes: (size) => crypto.randomBytes(size),
    hmac: (algorithm, secret, message) => {
        const hmac = crypto.createHmac(algorithm, secret);
        hmac.update(message);
        return hmac.digest();
    },
    constantTimeEqual: (a, b) => {
        if (a.length !== b.length) return false;
        try {
            return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
        } catch (e) {
            return false;
        }
    }
};

async function test() {
    console.log('--- Testing Authenticator with options override ---');
    // clonning options to avoid mutating the global authenticator if possible
    const auth = authenticator.clone({
        crypto: nativeCrypto,
        base32: nativeBase32
    });

    const secret = auth.generateSecret();
    console.log('Secret:', secret);

    try {
        const token = await auth.generate(secret);
        console.log('Token (auth.generate):', token);
        const ok = await auth.verify({ token, secret });
        console.log('Verify result:', ok);
    } catch (e) {
        console.log('Error:', e.message);
    }
}

test();
