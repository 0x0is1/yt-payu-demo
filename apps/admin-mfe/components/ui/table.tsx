import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={twMerge(clsx('w-full caption-bottom text-sm text-left', className))} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={twMerge(clsx('bg-slate-50', className))} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={twMerge(clsx(className))} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={twMerge(
        clsx('transition-colors hover:bg-slate-50/80 data-[state=selected]:bg-slate-100', className)
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={twMerge(
        clsx('h-10 px-4 text-xs font-semibold uppercase tracking-wider text-slate-600 align-middle', className)
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={twMerge(clsx('p-4 align-middle text-sm text-slate-800', className))} {...props} />;
}
