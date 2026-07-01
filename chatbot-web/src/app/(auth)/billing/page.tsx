'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';

interface BillingData {
  subscription: { plan: string; status: string; cancelAtPeriodEnd: boolean };
  usage: { creditsUsed: number; creditsTotal: number; thisMonthTokens: number };
  plans: { id: string; name: string; credits: number; priceId: string | null }[];
}

const PLAN_FEATURES: Record<string, { price: string; features: string[] }> = {
  FREE: {
    price: '$0',
    features: ['1,000 credits', '2 knowledge bases', '50 conversations', 'Basic models'],
  },
  STARTER: {
    price: '$10/mo',
    features: ['10,000 credits', '5 knowledge bases', '200 conversations', 'GPT-4o access'],
  },
  PRO: {
    price: '$30/mo',
    features: ['100,000 credits', '20 knowledge bases', '1,000 conversations', 'All models + Claude'],
  },
  ENTERPRISE: {
    price: '$100/mo',
    features: ['1M credits', '100 knowledge bases', 'Unlimited conversations', 'All models + priority'],
  },
};

export default function BillingPage() {
  const { data: session } = useSession();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing')
      .then(r => r.json())
      .then(d => { setBilling(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleUpgrade(priceId: string | null) {
    if (!priceId) return;
    setActionLoading(priceId);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setActionLoading(null);
    }
  }

  async function handleManageSubscription() {
    setActionLoading('portal');
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setActionLoading(null);
    }
  }

  const currentPlan = billing?.subscription.plan ?? 'FREE';
  const status = billing?.subscription.status ?? 'ACTIVE';
  const creditsUsed = billing?.usage.creditsUsed ?? 0;
  const creditsTotal = billing?.usage.creditsTotal ?? 1000;
  const plans = billing?.plans ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 overflow-y-auto p-6">
      <h1 className="text-2xl font-semibold">Billing</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold capitalize">{currentPlan.toLowerCase()}</span>
              <Badge variant={status === 'ACTIVE' ? 'default' : status === 'PAST_DUE' ? 'destructive' : 'secondary'}>
                {status === 'PAST_DUE' ? 'Past Due' : status === 'CANCELED' ? 'Canceled' : 'Active'}
              </Badge>
            </div>
            {billing?.subscription.cancelAtPeriodEnd && (
              <p className="mt-1 text-xs text-muted-foreground">Cancels at period end</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.max(0, creditsTotal - creditsUsed).toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground"> / {creditsTotal.toLocaleString()}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {creditsUsed > creditsTotal ? '0' : ((1 - Math.min(creditsUsed, creditsTotal) / creditsTotal) * 100).toFixed(0)}% remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month (Tokens)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(billing?.usage.thisMonthTokens ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {currentPlan !== 'FREE' && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>Update payment method, view invoices, or cancel your subscription.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleManageSubscription} disabled={actionLoading === 'portal'}>
              {actionLoading === 'portal' ? 'Loading...' : 'Manage Subscription'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
          <CardDescription>Choose the plan that fits your needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {plans.map(plan => {
              const isCurrent = currentPlan === plan.id;
              const features = PLAN_FEATURES[plan.id]?.features ?? [];

              return (
                <Card key={plan.id} className={isCurrent ? 'border-primary' : ''}>
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription className="text-xl font-bold text-foreground">
                      {PLAN_FEATURES[plan.id]?.price ?? ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1.5">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <svg className="h-3.5 w-3.5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7" /></svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isCurrent ? 'secondary' : 'default'}
                      disabled={isCurrent || actionLoading === plan.priceId}
                      onClick={() => handleUpgrade(plan.priceId)}
                    >
                      {isCurrent ? 'Current' : actionLoading === plan.priceId ? 'Loading...' : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
