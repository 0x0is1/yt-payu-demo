import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { AdminOrdersProvider } from '@/context/AdminOrdersContext';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'PayU Admin Portal',
  description: 'Admin payment link generator and real-time requests dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <AuthProvider>
          <WebSocketProvider>
            <AdminOrdersProvider>
              <Navbar />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </main>
            </AdminOrdersProvider>
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
