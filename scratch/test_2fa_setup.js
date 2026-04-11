const handler = require('../src/pages/api/auth/2fa/setup').default;

async function test() {
    const req = {
        method: 'POST',
        headers: {
            'x-request-id': 'test-id'
        },
        body: {}
    };
    const res = {
        status: function(s) { 
            console.log('Status:', s); 
            return this; 
        },
        json: function(j) { 
            console.log('JSON:', JSON.stringify(j, null, 2)); 
            return this; 
        }
    };

    try {
        console.log('--- TESTING 2FA SETUP HANDLER ---');
        await handler(req, res);
    } catch (e) {
        console.error('CRASH DETECTED:', e);
    }
}

test();
