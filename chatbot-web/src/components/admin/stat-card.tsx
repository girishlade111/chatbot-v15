'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; positive: boolean };
}

export function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">{value}</span>
            {trend && (
              <span className={cn(
                'flex items-center gap-0.5 text-sm',
                trend.positive ? 'text-emerald-500' : 'text-red-500'
              )}>
                {trend.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
