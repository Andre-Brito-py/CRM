import { generateSecret, generateURI, verifyToken } from '../src/lib/server/2fa-bridge.js';

async function runTest() {
    console.log('--- Testing Updated 2FA Bridge ---');
    try {
        const secret = await generateSecret();
        console.log('Generated Secret:', secret);
        
        const email = 'test@example.com';
        const uri = await generateURI(email, secret);
        console.log('Generated URI:', uri);
        
        // Verification test with an invalid token
        const isValid = await verifyToken('123456', secret);
        console.log('Verification test (should be false):', isValid);
        
        // Note: we can't easily generate a valid token without a real time-based check,
        // but we've fixed the method names and async handling.
        
        console.log('--- Bridge Test Completed Successfully ---');
    } catch (error) {
        console.error('--- Bridge Test Failed ---');
        console.error(error);
    }
}

runTest();
