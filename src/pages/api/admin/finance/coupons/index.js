import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { createCoupon, deleteCoupon } from '@/lib/server/stripe';
import { log, reportError } from '@/lib/server/logger';

const handler = async (req, res) => {
  const { method } = req;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  const session = await validateSession(req, res);
  if (!session || session.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  switch (method) {
    case 'GET':
      try {
        const coupons = await prisma.coupon.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { promotionCodes: true }
            }
          }
        });
        res.status(200).json({ data: { coupons } });
      } catch (error) {
        log({ level: 'error', msg: 'admin_coupons_list_failed', requestId, error });
        res.status(500).json({ error: { msg: 'Unable to fetch coupons' } });
      }
      break;

    case 'POST':
      try {
        const { name, amountOff, percentOff, currency, duration, durationInMonths, maxRedemptions } = req.body;

        if (!name || (!amountOff && !percentOff) || !duration) {
          return res.status(400).json({ error: { msg: 'Missing required fields' } });
        }

        // 1. Create in Stripe
        const stripeCoupon = await createCoupon({
          name,
          amountOff: amountOff ? Number(amountOff) : null,
          percentOff: percentOff ? Number(percentOff) : null,
          currency,
          duration,
          durationInMonths: durationInMonths ? Number(durationInMonths) : null,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        });

        // 2. Save in DB
        const coupon = await prisma.coupon.create({
          data: {
            name,
            stripeCouponId: stripeCoupon.id,
            amountOff: amountOff ? Number(amountOff) : null,
            percentOff: percentOff ? Number(percentOff) : null,
            currency: currency || 'BRL',
            duration,
            durationInMonths: durationInMonths ? Number(durationInMonths) : null,
            maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
          }
        });

        res.status(201).json({ data: { coupon } });
      } catch (error) {
        log({ level: 'error', msg: 'admin_coupon_create_failed', requestId, error });
        reportError(error, { route: '/api/admin/finance/coupons', requestId });
        res.status(500).json({ error: { msg: error.message || 'Unable to create coupon' } });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.body;
        const coupon = await prisma.coupon.findUnique({ where: { id } });
        
        if (!coupon) {
          return res.status(404).json({ error: { msg: 'Coupon not found' } });
        }

        // Delete in Stripe if exists
        if (coupon.stripeCouponId) {
          await deleteCoupon(coupon.stripeCouponId).catch(err => {
            console.warn('Stripe coupon deletion failed or already deleted:', err.message);
          });
        }

        await prisma.coupon.delete({ where: { id } });
        res.status(200).json({ data: { success: true } });
      } catch (error) {
        log({ level: 'error', msg: 'admin_coupon_delete_failed', requestId, error });
        res.status(500).json({ error: { msg: 'Unable to delete coupon' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
