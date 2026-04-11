import { TOTP } from 'otplib';

async function test() {
    const totp = new TOTP();
    // We need to provide a crypto plugin for otplib v13
    // but let's see if we can just see the signature
    console.log('TOTP.verify.length:', totp.verify.length);
}

test();
