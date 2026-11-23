import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={twMerge(
          clsx(
            'flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-gold-600 focus:ring-1 focus:ring-gold-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200',
            className
          )
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
