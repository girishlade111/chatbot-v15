'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, ...props }, ref) => (
    <input
      type="range"
      ref={ref}
      className={cn(
        'w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary',
        className
      )}
      {...props}
    />
  )
);
Slider.displayName = 'Slider';
