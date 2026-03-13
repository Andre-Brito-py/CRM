import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { createPromotionCode, updatePromotionCode } from '@/lib/server/stripe';
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
        const { couponId } = req.query;
        const codes = await prisma.promotionCode.findMany({
          where: couponId ? { couponId } : {},
          orderBy: { createdAt: 'desc' },
          include: { coupon: true }
        });
        res.status(200).json({ data: { codes } });
      } catch (error) {
        log({ level: 'error', msg: 'admin_promo_codes_list_failed', requestId, error });
        res.status(500).json({ error: { msg: 'Unable to fetch promotion codes' } });
      }
      break;

    case 'POST':
      try {
        const { couponId, code, maxRedemptions, expiresAt } = req.body;

        if (!couponId || !code) {
          return res.status(400).json({ error: { msg: 'Missing required fields' } });
        }

        const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
        if (!coupon || !coupon.stripeCouponId) {
          return res.status(400).json({ error: { msg: 'Valid parent coupon required' } });
        }

        // 1. Create in Stripe
        const stripePromo = await createPromotionCode({
          couponId: coupon.stripeCouponId,
          code,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
          expiresAt,
        });

        // 2. Save in DB
        const promoCode = await prisma.promotionCode.create({
          data: {
            code,
            couponId,
            stripePromoId: stripePromo.id,
            maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          }
        });

        res.status(201).json({ data: { promoCode } });
      } catch (error) {
        log({ level: 'error', msg: 'admin_promo_code_create_failed', requestId, error });
        reportError(error, { route: '/api/admin/finance/promotion-codes', requestId });
        res.status(500).json({ error: { msg: error.message || 'Unable to create promotion code' } });
      }
      break;

    case 'PATCH':
      try {
        const { id, isActive } = req.body;
        const promo = await prisma.promotionCode.findUnique({ where: { id } });
        
        if (!promo) {
          return res.status(404).json({ error: { msg: 'Code not found' } });
        }

        if (promo.stripePromoId) {
          await updatePromotionCode(promo.stripePromoId, { active: isActive });
        }

        await prisma.promotionCode.update({
          where: { id },
          data: { isActive }
        });

        res.status(200).json({ data: { success: true } });
      } catch (error) {
        log({ level: 'error', msg: 'admin_promo_code_update_failed', requestId, error });
        res.status(500).json({ error: { msg: 'Unable to update code' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
