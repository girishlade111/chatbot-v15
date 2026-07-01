'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Admin Analytics</h1>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Users', value: '—' },
          { label: 'Messages Today', value: '—' },
          { label: 'Active Models', value: '4' },
          { label: 'Total Cost', value: '—' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{stat.value}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
