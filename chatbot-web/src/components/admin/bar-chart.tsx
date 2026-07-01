'use client';

import { motion } from 'framer-motion';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  showValues?: boolean;
}

export function BarChart({ data, maxValue, showValues = true }: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-right text-sm text-muted-foreground truncate" title={item.label}>
              {item.label}
            </span>
            <div className="relative flex-1 h-5 rounded-md bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-md"
                style={{ backgroundColor: item.color ?? 'var(--primary)' }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
              />
            </div>
            {showValues && (
              <span className="w-20 shrink-0 text-sm tabular-nums text-muted-foreground">
                {item.value.toLocaleString()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
