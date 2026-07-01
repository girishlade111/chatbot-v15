import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
  typescript: true,
});

export const PLANS = {
  FREE: { priceId: null, credits: 1000, name: 'Free' },
  STARTER: { priceId: process.env.STRIPE_STARTER_PRICE_ID, credits: 10000, name: 'Starter' },
  PRO: { priceId: process.env.STRIPE_PRO_PRICE_ID, credits: 100000, name: 'Pro' },
  ENTERPRISE: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID, credits: 1000000, name: 'Enterprise' },
} as const;

export type PlanTier = keyof typeof PLANS;

export function getPlanByPriceId(priceId: string): PlanTier | null {
  for (const [tier, config] of Object.entries(PLANS)) {
    if (config.priceId === priceId) return tier as PlanTier;
  }
  return null;
}

export function getPlanByStripeId(stripeSubscriptionId: string): PlanTier {
  return 'FREE';
}
