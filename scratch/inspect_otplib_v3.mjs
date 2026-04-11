import { getTotpInstance } from '../src/lib/server/2fa-bridge.js';

const totp = getTotpInstance();

try {
    const secret = totp.generateSecret();
    console.log('Testing toURI with object...');
    const uri = totp.toURI({
        secret,
        label: 'test@example.com',
        issuer: 'Vysify'
    });
    console.log('URI generated with object:', uri);
} catch (e) {
    console.log('toURI with object failed:', e.message);
}

try {
    const secret = totp.generateSecret();
    console.log('Testing toURI with separate args (label, issuer, secret)...');
    // In some versions it is (label, issuer, secret)
    const uri = totp.toURI('test@example.com', 'Vysify', secret);
    console.log('URI generated with separate args:', uri);
} catch (e) {
    console.log('toURI with separate args failed:', e.message);
}
