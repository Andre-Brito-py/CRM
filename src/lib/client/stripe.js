import { loadStripe } from '@stripe/stripe-js';

export const redirectToCheckout = async (sessionId) => {
  const response = await fetch('/api/public-config?keys=STRIPE_PUBLISHABLE_KEY');
  const json = await response.json();
  const publishableKey =
    json?.data?.config?.STRIPE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error('Stripe publishable key is missing');
  }

  const clientStripe = await loadStripe(
    publishableKey
  );
  await clientStripe.redirectToCheckout({ sessionId });
};
