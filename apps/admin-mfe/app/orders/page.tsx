'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAdminOrders, OrderItem } from '@/context/AdminOrdersContext';
import { OrdersTable } from './components/OrdersTable';
import { ConfirmUpiModal } from './components/ConfirmUpiModal';
import { AttemptsModal } from './components/AttemptsModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export default function AdminOrdersDashboardPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { orders, loading, retryOrder, confirmUpi } = useAdminOrders();
  const [selectedForUpi, setSelectedForUpi] = useState<OrderItem | null>(null);
  const [selectedForAttempts, setSelectedForAttempts] = useState<OrderItem | null>(null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm text-slate-500 font-medium">Verifying administrator session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center space-x-2 text-slate-800">
              <Lock className="h-5 w-5 text-gold-600" />
              <CardTitle>Authentication Required</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Viewing payment requests and transaction reconciliation requires administrator authentication.
            </p>
            <Link href="/login">
              <Button className="w-full">Sign In to Continue</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Payment Requests & Reconciliation
        </h1>
        <p className="text-sm text-slate-500">
          Live feed of created orders, customer payment attempts across platforms, UPI receipts, and link expiry status.
        </p>
      </div>

      <OrdersTable
        orders={orders}
        loading={loading}
        onRetry={retryOrder}
        onOpenConfirmUpi={(order) => setSelectedForUpi(order)}
        onOpenAttempts={(order) => setSelectedForAttempts(order)}
      />

      <ConfirmUpiModal
        isOpen={Boolean(selectedForUpi)}
        order={selectedForUpi}
        onClose={() => setSelectedForUpi(null)}
        onConfirm={confirmUpi}
      />

      <AttemptsModal
        isOpen={Boolean(selectedForAttempts)}
        order={selectedForAttempts}
        onClose={() => setSelectedForAttempts(null)}
      />
    </div>
  );
}
