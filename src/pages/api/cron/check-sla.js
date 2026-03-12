import { processSlaBreachAutomations } from '@/prisma/services/automation';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // To secure this endpoint we would typically check an Authorization header 
  // matching a CRON_SECRET from Vercel/GitHub Actions.
  // const authHeader = req.headers.authorization;
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ message: 'Unauthorized' });
  // }

  try {
    await processSlaBreachAutomations();
    res.status(200).json({ success: true, message: 'SLA breaches processed.' });
  } catch (error) {
    console.error('Failed to process SLAs: ', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
