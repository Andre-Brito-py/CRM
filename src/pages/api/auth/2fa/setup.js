import { validateSession } from '@/config/api-validation';
import { log } from '@/lib/server/logger';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '32kb',
        },
    },
};

const handler = async (req, res) => {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: { msg: 'Method not allowed' } });
        }

        const session = await validateSession(req, res);
        if (!session) return;

        // TEST RESPONSE to isolate "Invalid JSON" error
        return res.status(200).json({ 
            data: { 
                qrCodeUrl: 'TEST_MODE', 
                message: 'API is reachable' 
            } 
        });
    } catch (error) {
        console.error('[2FA TEST ERROR]:', error);
        return res.status(500).json({ 
            error: { 
                msg: 'API CRASHED', 
                detail: error.message 
            } 
        });
    }
};

export default handler;
