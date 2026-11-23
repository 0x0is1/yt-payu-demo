import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'gold' | 'orange' | 'success' | 'danger' | 'slate';
}

export function Badge({ className, variant = 'gold', ...props }: BadgeProps) {
  const variants = {
    gold: 'bg-amber-100 text-gold-700 border-gold-600',
    orange: 'bg-orange-100 text-orangeAccent-700 border-orangeAccent-600',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-600',
    danger: 'bg-rose-100 text-rose-800 border-rose-600',
    slate: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
          variants[variant],
          className
        )
      )}
      {...props}
    />
  );
}
