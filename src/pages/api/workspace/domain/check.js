import { validateSession } from '@/config/api-validation';
import api from '@/lib/common/api';
import { getSystemConfig } from '@/lib/server/config';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    await validateSession(req, res);
    const { domain } = req.query;
    const [teamId, apiUrl, token] = await Promise.all([
      getSystemConfig('VERCEL_TEAM_ID', process.env.VERCEL_TEAM_ID),
      getSystemConfig('VERCEL_API_URL', process.env.VERCEL_API_URL),
      getSystemConfig('VERCEL_AUTH_BEARER_TOKEN', process.env.VERCEL_AUTH_BEARER_TOKEN),
    ]);
    if (!apiUrl || !token) {
      res.status(500).json({ error: { msg: 'Vercel domain integration is not configured' } });
      return;
    }
    const response = await api(
      `${apiUrl}/v6/domains/${domain}/config${teamId ? `?teamId=${teamId}` : ''
      }`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'GET',
      }
    );
    const valid = response?.configuredBy ? true : false;
    res.status(200).json({ data: { valid } });
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
