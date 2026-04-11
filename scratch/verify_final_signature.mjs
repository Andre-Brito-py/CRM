import { TOTP } from 'otplib';
import crypto from 'crypto';

const nativeCrypto = {
    randomBytes: (size) => crypto.randomBytes(size),
    hmac: (algorithm, secret, message) => {
        const hmac = crypto.createHmac(algorithm, secret);
        hmac.update(message);
        return hmac.digest();
    },
    constantTimeEqual: (a, b) => {
        if (!a || !b || a.length !== b.length) return false;
        try {
            return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
        } catch (e) {
            return false;
        }
    }
};

async function test() {
    const t = new TOTP({ crypto: nativeCrypto });
    const s = t.generateSecret();
    const tok = await t.generate({ secret: s });
    console.log('Token:', tok);
    try {
        const ok = await t.verify(tok, { secret: s });
        console.log('Verify result (should be object with valid:true):', JSON.stringify(ok));
    } catch(e) {
        console.log('Verify error:', e.message);
    }
}

test();
