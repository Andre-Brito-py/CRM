import { processSlaBreachAutomations } from '@/prisma/services/automation';
import { getSystemConfig } from '@/lib/server/config';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (process.env.NODE_ENV === 'production') {
    const secret = await getSystemConfig('CRON_SECRET', process.env.CRON_SECRET);
    if (!secret) return res.status(500).json({ message: 'CRON_SECRET not configured' });
    const authHeader = req.headers.authorization;
    const headerSecret = req.headers['x-cron-secret'];
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (headerSecret !== secret && bearer !== secret) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }

  try {
    await processSlaBreachAutomations();
    res.status(200).json({ success: true, message: 'SLA breaches processed.' });
  } catch (error) {
    console.error('Failed to process SLAs: ', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
