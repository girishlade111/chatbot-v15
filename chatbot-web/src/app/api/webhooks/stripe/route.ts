import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe as stripeClient, PLANS, getPlanByPriceId } from '@/lib/billing/stripe';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing stripe-signature or webhook secret' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) break;

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;
        const priceId = session.metadata?.priceId || session.line_items?.data?.[0]?.price?.id;
        const plan = priceId ? getPlanByPriceId(priceId) : 'FREE';

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const credits = PLANS[plan as keyof typeof PLANS]?.credits ?? PLANS.FREE.credits;

        await prisma.$transaction([
          prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeId: subscriptionId,
              plan,
              status: 'ACTIVE',
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
            update: {
              stripeId: subscriptionId,
              plan,
              status: 'ACTIVE',
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          }),
          prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: credits } },
          }),
        ]);

        if (customerId) {
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customerId },
          });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const sub = await prisma.subscription.findUnique({ where: { stripeId: subscriptionId } });
        if (!sub) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? getPlanByPriceId(priceId) : 'FREE';
        const credits = PLANS[plan as keyof typeof PLANS]?.credits ?? PLANS.FREE.credits;

        await prisma.$transaction([
          prisma.subscription.update({
            where: { stripeId: subscriptionId },
            data: {
              plan,
              status: 'ACTIVE',
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          }),
          prisma.user.update({
            where: { id: sub.userId },
            data: { credits: { increment: credits } },
          }),
        ]);
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object as Stripe.Invoice;
        const failedSubId = failedInvoice.subscription as string;
        if (!failedSubId) break;

        await prisma.subscription.update({
          where: { stripeId: failedSubId },
          data: { status: 'PAST_DUE' },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const updatedSub = event.data.object as Stripe.Subscription;
        const updatedPriceId = updatedSub.items.data[0]?.price?.id;
        const updatedPlan = updatedPriceId ? getPlanByPriceId(updatedPriceId) : 'FREE';

        await prisma.subscription.update({
          where: { stripeId: updatedSub.id },
          data: {
            plan: updatedPlan,
            status: updatedSub.status === 'active' ? 'ACTIVE' : updatedSub.status === 'past_due' ? 'PAST_DUE' : 'CANCELED',
            currentPeriodStart: new Date(updatedSub.current_period_start * 1000),
            currentPeriodEnd: new Date(updatedSub.current_period_end * 1000),
            cancelAtPeriodEnd: updatedSub.cancel_at_period_end,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object as Stripe.Subscription;
        const subRecord = await prisma.subscription.findUnique({ where: { stripeId: deletedSub.id } });

        await prisma.subscription.update({
          where: { stripeId: deletedSub.id },
          data: {
            plan: 'FREE',
            status: 'CANCELED',
            currentPeriodEnd: new Date(deletedSub.current_period_end * 1000),
            cancelAtPeriodEnd: false,
          },
        });

        if (subRecord) {
          await prisma.user.update({
            where: { id: subRecord.userId },
            data: { credits: PLANS.FREE.credits },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}
