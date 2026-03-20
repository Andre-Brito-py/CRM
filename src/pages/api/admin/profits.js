import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';
import getStripe from '@/lib/server/stripe';

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      // 1. Calculate Monthly Recurring Revenue (MRR) from Stripe
      const stripe = await getStripe();
      let mrr = 0;
      let hasMore = true;
      let startingAfter = undefined;
      
      while (hasMore) {
        const subscriptions = await stripe.subscriptions.list({
          status: 'active',
          limit: 100,
          starting_after: startingAfter,
        });
        
        subscriptions.data.forEach(sub => {
          const price = sub.items.data[0]?.price;
          if (price) {
            let amount = price.unit_amount || 0;
            // Normalize to monthly equivalent
            if (price.recurring?.interval === 'year') {
              amount = amount / 12;
            }
            mrr += (amount / 100);
          }
        });
        
        hasMore = subscriptions.has_more;
        if (hasMore) {
          startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
        }
      }

      // 2. Calculate Platform Fees (Marketplace splits)
      const platformFeesResult = await prisma.payment.aggregate({
        _sum: { platformFee: true },
        where: {
          status: 'PAID',
          deletedAt: null,
          platformFee: { gt: 0 }
        }
      });
      const marketplaceFees = Number(platformFeesResult._sum.platformFee) || 0;

      // 3. Calculate AI Overage Billing
      const aiUsageResult = await prisma.aiUsageEvent.aggregate({
        _sum: { billedAmount: true },
        where: {
          overageMode: true,
          billedAmount: { gt: 0 }
        }
      });
      
      const aiOverages = (Number(aiUsageResult._sum.billedAmount) || 0) / 100; // Stripe amounts are in cents

      res.status(200).json({
        data: {
          mrr,
          marketplaceFees,
          aiOverages,
          totalProfit: mrr + marketplaceFees + aiOverages
        },
      });
    } catch (error) {
      console.error('Profits fetch error:', error);
      res.status(500).json({ error: { msg: 'Failed to fetch profits details' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
