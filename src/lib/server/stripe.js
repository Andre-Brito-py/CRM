import initStripe from 'stripe';
import { getSystemConfig } from '@/lib/server/config';

let stripeClient = null;

const getStripe = async () => {
  if (!stripeClient) {
    const secretKey = await getSystemConfig('PAYMENTS_SECRET_KEY', process.env.PAYMENTS_SECRET_KEY);
    if (!secretKey) throw new Error('Stripe secret key is missing');
    stripeClient = initStripe(secretKey);
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

export default getStripe;
