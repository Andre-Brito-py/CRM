import { TOTP } from 'otplib';
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
    }
};

async function test() {
    const totp = new TOTP({
        crypto: nativeCrypto,
        base32: nativeBase32
    });

    const secret = totp.generateSecret();
    const token = await totp.generate({ secret });
    console.log('Secret:', secret);
    console.log('Token:', token);

    try {
        console.log('Testing verify({ token, secret })...');
        const isValid = await totp.verify({ token, secret });
        console.log('Result verify({ token, secret }):', isValid);
    } catch (e) {
        console.log('verify({ token, secret }) failed:', e.message);
    }

    try {
        console.log('Testing verify(token, secret) as separate args...');
        const isValid = await totp.verify(token, secret);
        console.log('Result verify(token, secret):', isValid);
    } catch (e) {
        console.log('verify(token, secret) failed:', e.message);
    }
}

test();
