import { getTotpInstance } from '../src/lib/server/2fa-bridge.js';

const totp = getTotpInstance();
console.log('toURI exists:', typeof totp.toURI);

try {
    const secret = totp.generateSecret();
    const uri = totp.toURI(secret, 'test@example.com', 'Vysify');
    console.log('URI generated:', uri);
} catch (e) {
    console.log('toURI failed:', e.message);
}
