'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';

interface DailyChartProps {
  data: { date: string; messages: number; tokens: number }[];
  metric: 'messages' | 'tokens';
  days?: number;
}

export function DailyChart({ data, metric, days = 30 }: DailyChartProps) {
  const sliced = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-days);
  }, [data, days]);

  const maxValue = Math.max(...sliced.map(d => d[metric]), 1);

  return (
    <div className="flex items-end gap-[2px] h-40">
      {sliced.map((item, i) => {
        const height = (item[metric] / maxValue) * 100;
        return (
          <div key={item.date} className="relative flex-1 flex flex-col items-center justify-end h-full group">
            <motion.div
              className="w-full rounded-t-sm bg-primary/60 hover:bg-primary/90 transition-colors cursor-pointer"
              style={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.3, delay: i * 0.01, ease: 'easeOut' }}
            />
            <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
              <div className="whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md border">
                {format(parseISO(item.date), 'MMM d')}: {item[metric].toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
