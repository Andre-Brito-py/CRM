import initStripe from 'stripe';
import { getSystemConfig } from '@/lib/server/config';

let stripeClient = null;
let stripeClientKeyHash = null;

const hashKey = (value) => {
  if (!value) return null;
  let hash = 0;
  const s = String(value);
  for (let i = 0; i < s.length; i += 1) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return String(hash);
};

const getStripe = async () => {
  const secretKey = await getSystemConfig('PAYMENTS_SECRET_KEY', process.env.PAYMENTS_SECRET_KEY);
  if (!secretKey) throw new Error('Stripe secret key is missing');

  const nextHash = hashKey(secretKey);
  if (!stripeClient || stripeClientKeyHash !== nextHash) {
    stripeClient = initStripe(secretKey);
    stripeClientKeyHash = nextHash;
  }
  return stripeClient;
};

export const createCustomer = async (email) => {
  const stripe = await getStripe();
  return await stripe.customers.create({ email });
};

export const getInvoices = async (customer) => {
  if (!customer) return [];
  const stripe = await getStripe();
  const invoices = await stripe.invoices.list({ customer });
  return invoices?.data;
};

export const getProducts = async () => {
  const stripe = await getStripe();
  const [products, prices] = await Promise.all([
    stripe.products.list(),
    stripe.prices.list(),
  ]);
  const productPrices = {};
  prices?.data.map((price) => (productPrices[price.product] = price));
  products?.data.map((product) => (product.prices = productPrices[product.id]));
  return products?.data.reverse();
};

export const createCoupon = async ({ name, amountOff, percentOff, currency, duration, durationInMonths }) => {
  const stripe = await getStripe();
  const params = {
    name,
    duration,
    duration_in_months: duration === 'repeating' ? durationInMonths : undefined,
  };

  if (amountOff) {
    params.amount_off = Math.round(amountOff * 100);
    params.currency = currency || 'usd';
  } else if (percentOff) {
    params.percent_off = percentOff;
  }

  return await stripe.coupons.create(params);
};

export const deleteCoupon = async (couponId) => {
  const stripe = await getStripe();
  return await stripe.coupons.del(couponId);
};

export const createPromotionCode = async ({ couponId, code, maxRedemptions, expiresAt }) => {
  const stripe = await getStripe();
  return await stripe.promotionCodes.create({
    coupon: couponId,
    code,
    max_redemptions: maxRedemptions || undefined,
    expires_at: expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : undefined,
  });
};

export const updatePromotionCode = async (promoId, { active }) => {
  const stripe = await getStripe();
  return await stripe.promotionCodes.update(promoId, { active });
};

export default getStripe;
