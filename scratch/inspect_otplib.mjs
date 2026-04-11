import { TOTP } from 'otplib';
import { getTotpInstance } from '../src/lib/server/2fa-bridge.js';

const totp = getTotpInstance();
console.log('TOTP methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(totp)));
console.log('TOTP keys:', Object.keys(totp));
console.log('generateSecret exists:', typeof totp.generateSecret);
console.log('keyuri exists:', typeof totp.keyuri);
console.log('generateURI exists:', typeof totp.generateURI);
console.log('check exists:', typeof totp.check);
console.log('verify exists:', typeof totp.verify);
