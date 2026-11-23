'use client';

import React, { useState } from 'react';
import { useAdminOrders, OrderItem } from '@/context/AdminOrdersContext';
import { OrdersTable } from './components/OrdersTable';
import { ConfirmUpiModal } from './components/ConfirmUpiModal';
import { AttemptsModal } from './components/AttemptsModal';

export default function AdminOrdersDashboardPage() {
  const { orders, loading, retryOrder, confirmUpi } = useAdminOrders();
  const [selectedForUpi, setSelectedForUpi] = useState<OrderItem | null>(null);
  const [selectedForAttempts, setSelectedForAttempts] = useState<OrderItem | null>(null);

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
