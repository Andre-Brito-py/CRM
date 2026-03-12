import { processDueAutomationJobs } from '@/prisma/services/automation';

const handler = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'CRON_SECRET not configured' });
    }
    if (req.headers['x-cron-secret'] !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const result = await processDueAutomationJobs();
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Error processing automation jobs:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export default handler;
