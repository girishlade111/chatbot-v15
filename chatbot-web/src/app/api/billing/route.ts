import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { PLANS } from '@/lib/billing/stripe';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [subscription, user, thisMonthUsage] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, stripeCustomerId: true },
    }),
    prisma.usageLog.aggregate({
      where: {
        userId: session.user.id,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { tokensIn: true, tokensOut: true },
    }),
  ]);

  const planTier = (subscription?.plan ?? 'FREE') as keyof typeof PLANS;
  const planConfig = PLANS[planTier] ?? PLANS.FREE;

  return NextResponse.json({
    subscription: subscription
      ? {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          createdAt: subscription.createdAt,
        }
      : { plan: 'FREE', status: 'ACTIVE', cancelAtPeriodEnd: false },
    usage: {
      creditsUsed: planConfig.credits - (user?.credits ?? 0),
      creditsTotal: planConfig.credits,
      thisMonthTokens: (thisMonthUsage._sum.tokensIn ?? 0) + (thisMonthUsage._sum.tokensOut ?? 0),
    },
    plans: Object.entries(PLANS).map(([id, config]) => ({
      id,
      name: config.name,
      credits: config.credits,
      priceId: config.priceId,
    })),
  });
}
