import { validateSession } from '@/config/api-validation';
import { rateLimit } from '@/lib/server/rateLimit';

const handler = async (req, res) => {
  try {
    const rl = await rateLimit({ req, limit: 60, windowMs: 60_000 });
    if (!rl.ok) {
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    const session = await validateSession(req, res);
    if (!session) return; // validateSession automagicamente retorna 401 se falhar

    if (req.method === 'GET') {
      return res.status(200).json({
        data: {
          user: session.user,
          workspaceId: session.workspaceId || null,
        },
      });
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('Auth Test Endpoint Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default handler;
