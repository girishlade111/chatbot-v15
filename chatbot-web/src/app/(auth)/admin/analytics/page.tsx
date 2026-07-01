'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminLayout, StatCard, BarChart, DailyChart } from '@/components/admin';
import { BarChart3, Users, Activity, DollarSign, Clock, Cpu, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface AnalyticsData {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  messagesToday: number;
  activeUsers24h: number;
  mostUsedModel: string;
  avgLatencyMs: number;
  modelUsage: { name: string; count: number; tokens: number; cost: number }[];
  dailyUsage: { date: string; messages: number; tokens: number; cost: number }[];
  topUsers: { id: string; email: string; messages: number; tokens: number }[];
}

type Range = '24h' | '7d' | '30d' | 'all';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [range, setRange] = useState<Range>('30d');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/admin/analytics');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const modelColors = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && !data && (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && !data && (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Activity className="h-10 w-10" />
          <p className="text-sm">Failed to load analytics</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {data && (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Total Users" value={data.totalUsers.toLocaleString()} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Messages Today" value={data.messagesToday.toLocaleString()} icon={<Activity className="h-5 w-5" />} />
            <StatCard title="Active Users (24h)" value={data.activeUsers24h.toLocaleString()} icon={<BarChart3 className="h-5 w-5" />} />
            <StatCard title="Total Cost" value={`$${data.totalCost.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />} />
            <StatCard title="Avg Latency" value={`${Math.round(data.avgLatencyMs)}ms`} icon={<Clock className="h-5 w-5" />} />
            <StatCard title="Most Used Model" value={data.mostUsedModel} icon={<Cpu className="h-5 w-5" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Model Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {data.modelUsage.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No model usage data</p>
                ) : (
                  <BarChart
                    data={data.modelUsage.map((m, i) => ({
                      label: m.name,
                      value: m.count,
                      color: modelColors[i % modelColors.length],
                    }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Daily Usage</CardTitle>
                <select
                  value={range}
                  onChange={e => setRange(e.target.value as Range)}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                  <option value="all">All time</option>
                </select>
              </CardHeader>
              <CardContent>
                {data.dailyUsage.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No daily usage data</p>
                ) : (
                  <DailyChart
                    data={data.dailyUsage}
                    metric="messages"
                    days={range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : data.dailyUsage.length}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Users</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topUsers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No user activity data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 text-xs font-medium text-muted-foreground">Email</th>
                        <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Messages</th>
                        <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Tokens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topUsers.map((u, i) => (
                        <motion.tr
                          key={u.id}
                          className="border-b last:border-0"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.03 }}
                        >
                          <td className="py-2.5">{u.email}</td>
                          <td className="py-2.5 text-right tabular-nums">{u.messages.toLocaleString()}</td>
                          <td className="py-2.5 text-right tabular-nums">{u.tokens.toLocaleString()}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AdminLayout>
  );
}
