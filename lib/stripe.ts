import Stripe from 'stripe';

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  return new Stripe(secretKey, {
    // Keeping apiVersion unset uses the SDK default.
    // You can pin this later if desired.
    typescript: true,
  });
}

export function getStripePriceIdForTier(tier: 'pro' | 'creator' | 'organization'): string {
  const key =
    tier === 'pro'
      ? 'STRIPE_PRICE_PRO'
      : tier === 'creator'
        ? 'STRIPE_PRICE_CREATOR'
        : 'STRIPE_PRICE_ORGANIZATION';

  const priceId = process.env[key];
  if (!priceId) {
    throw new Error(`${key} is not set`);
  }

  return priceId;
}
