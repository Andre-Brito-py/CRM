import { authenticator } from 'otplib';

console.log('--- Testing Authenticator ---');
try {
    const secret = authenticator.generateSecret();
    console.log('Secret:', secret);
    const token = authenticator.generate(secret);
    console.log('Token:', token);
    const isValid = authenticator.verify({ token, secret });
    console.log('Is Valid:', isValid);
    const uri = authenticator.keyuri('test@example.com', 'Vysify', secret);
    console.log('URI:', uri);
} catch (e) {
    console.error('Authenticator test failed:', e);
}
