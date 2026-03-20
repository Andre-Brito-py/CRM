import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';
import getStripe from '@/lib/server/stripe';

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      // 1. Calculate Monthly Recurring Revenue (MRR) grouped by currency
      const stripe = await getStripe();
      const mrrByCurrency = {};
      let hasMore = true;
      let startingAfter = undefined;
      
      while (hasMore) {
        const subscriptions = await stripe.subscriptions.list({
          status: 'active',
          limit: 100,
          starting_after: startingAfter,
          expand: ['data.items.data.price'],
        });
        
        subscriptions.data.forEach(sub => {
          const price = sub.items.data[0]?.price;
          if (price) {
            const currency = String(price.currency || 'usd').toUpperCase();
            let amount = price.unit_amount || 0;
            // Normalize to monthly equivalent
            if (price.recurring?.interval === 'year') {
              amount = amount / 12;
            }
            const monthlyAmount = amount / 100;
            mrrByCurrency[currency] = (mrrByCurrency[currency] || 0) + monthlyAmount;
          }
        });
        
        hasMore = subscriptions.has_more;
        if (hasMore) {
          startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
        }
      }

      // 2. Calculate Platform Fees grouped by currency
      const platformFees = await prisma.payment.groupBy({
        by: ['currency'],
        _sum: { platformFee: true },
        where: {
          status: 'PAID',
          deletedAt: null,
          platformFee: { gt: 0 }
        }
      });

      const feesByCurrency = {};
      platformFees.forEach(f => {
        const curr = String(f.currency || 'BRL').toUpperCase();
        feesByCurrency[curr] = Number(f._sum.platformFee) || 0;
      });

      // 3. Calculate AI Overage Billing grouped by currency
      const aiUsage = await prisma.aiUsageEvent.groupBy({
        by: ['billedCurrency'],
        _sum: { billedAmount: true },
        where: {
          overageMode: true,
          billedAmount: { gt: 0 }
        }
      });
      
      const aiOveragesByCurrency = {};
      aiUsage.forEach(a => {
        const curr = String(a.billedCurrency || 'USD').toUpperCase();
        aiOveragesByCurrency[curr] = (Number(a._sum.billedAmount) || 0) / 100;
      });

      // Aggregate all currencies found
      const allCurrencies = new Set([
        ...Object.keys(mrrByCurrency),
        ...Object.keys(feesByCurrency),
        ...Object.keys(aiOveragesByCurrency)
      ]);

      const totalsByCurrency = {};
      allCurrencies.forEach(curr => {
        const mrr = mrrByCurrency[curr] || 0;
        const fees = feesByCurrency[curr] || 0;
        const ai = aiOveragesByCurrency[curr] || 0;
        totalsByCurrency[curr] = {
          mrr,
          marketplaceFees: fees,
          aiOverages: ai,
          totalProfit: mrr + fees + ai
        };
      });

      res.status(200).json({
        data: {
          currencies: totalsByCurrency,
          // Fallback legacy support (can be deprecated later)
          mrr: mrrByCurrency['BRL'] || mrrByCurrency['USD'] || 0,
          totalProfit: (mrrByCurrency['BRL'] || 0) + (feesByCurrency['BRL'] || 0) + (aiOveragesByCurrency['BRL'] || 0)
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
