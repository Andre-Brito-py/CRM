import { validateSession } from '@/config/api-validation';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '16kb',
        },
    },
};

const handler = async (req, res) => {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: { msg: 'Method unsupported' } });
        }

        const session = await validateSession(req, res);
        if (!session) return;

        return res.status(200).json({ data: { success: true, message: 'Verify API is reachable' } });
    } catch (error) {
        return res.status(500).json({ error: { msg: 'Verify API Crashed', detail: error.message } });
    }
};

export default handler;
