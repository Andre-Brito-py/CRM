import { processGlobalInactivityAutomation } from '@/prisma/services/automation';

const handler = async (req, res) => {
  // Only allow GET or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await processGlobalInactivityAutomation();
    res.status(200).json({ success: true, message: 'Inactivity automation processed' });
  } catch (error) {
    console.error('Error processing inactivity automation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default handler;
