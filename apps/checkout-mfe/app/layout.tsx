import './globals.css';
import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'PayU Secure Checkout',
  description: 'Fast, secure checkout powered by PayU',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <header className="border border-slate-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="h-8 w-8 rounded bg-gold-600 text-white font-bold flex items-center justify-center text-base">
                P
              </span>
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                PayU Checkout
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="font-medium">256-Bit SSL Encrypted</span>
            </div>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
