import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={twMerge(
        clsx('text-xs font-semibold text-slate-700 uppercase tracking-wider', className)
      )}
      {...props}
    />
  );
}
