import { getServerSession } from 'next-auth/next';
import { getAuthOptions } from '@/lib/server/auth';
import { getPayment } from '@/prisma/services/customer';
import { getInvoices } from '@/lib/server/stripe';
import { getSystemConfig } from '@/lib/server/config';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authOptions = await getAuthOptions();
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const stripeKey = await getSystemConfig('PAYMENTS_SECRET_KEY', process.env.PAYMENTS_SECRET_KEY);
  if (!stripeKey) {
    return res.status(200).json({ data: [] });
  }

  try {
    const customerPayment = await getPayment(session.user.email);
    const invoices = await getInvoices(customerPayment?.paymentId);
    
    return res.status(200).json({ data: invoices || [] });
  } catch (error) {
    console.error('Error fetching invoices API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
