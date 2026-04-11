import { verify, generate, generateSecret, TOTP } from 'otplib';
import crypto from 'crypto';

const nativeCrypto = {
    randomBytes: (size) => crypto.randomBytes(size),
    hmac: (algorithm, secret, message) => {
        const hmac = crypto.createHmac(algorithm, secret);
        hmac.update(message);
        return hmac.digest();
    }
};

async function test() {
    const secret = generateSecret();
    console.log('Secret:', secret);

    const token = await generate({
        secret,
        crypto: nativeCrypto
    });
    console.log('Token:', token);

    try {
        console.log('Testing top-level verify...');
        const ok = await verify({
            token,
            secret,
            crypto: nativeCrypto
        });
        console.log('Top-level verify result:', ok);
    } catch (e) {
        console.log('Top-level verify error:', e.message);
    }
}

test();
