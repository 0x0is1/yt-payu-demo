import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const variants = {
      primary: 'bg-gold-600 text-white hover:bg-gold-700 active:bg-orangeAccent-600 border border-gold-600',
      secondary: 'bg-orangeAccent-600 text-white hover:bg-orangeAccent-700 active:bg-gold-700 border border-orangeAccent-600',
      outline: 'bg-white text-gold-600 border border-gold-600 hover:bg-amber-50 active:bg-amber-100',
      ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 border border-transparent',
      danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={twMerge(clsx(base, variants[variant], sizes[size], className))}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
