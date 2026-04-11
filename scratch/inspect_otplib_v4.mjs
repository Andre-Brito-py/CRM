import { getTotpInstance } from '../src/lib/server/2fa-bridge.js';

const totp = getTotpInstance();
const secret = totp.generateSecret();
const token = totp.generate(secret);

console.log('Secret:', secret);
console.log('Token:', token);

const isValid = totp.verify({ token, secret });
console.log('Verification with object:', isValid);

const isValid2 = totp.check(token, secret);
console.log('Verification with check(token, secret):', isValid2);
