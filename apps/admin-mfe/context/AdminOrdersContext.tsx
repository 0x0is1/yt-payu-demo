'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebSocketContext } from './WebSocketContext';

export interface PaymentAttempt {
  id: string;
  orderId: string;
  platform: string;
  status: string;
  referenceData?: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  identifierId: string;
  baseAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  isForeign?: boolean | null;
  nationality?: string | null;
  status: string;
  paymentMethod?: string | null;
  razorpayPaymentLinkId?: string | null;
  razorpayPaymentLinkUrl?: string | null;
  razorpayPaymentId?: string | null;
  razorpayFee?: number | null;
  upiTransactionId?: string | null;
  upiMarkedPaidAt?: string | null;
  upiConfirmedAt?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  attempts: PaymentAttempt[];
}

interface AdminOrdersContextType {
  orders: OrderItem[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  retryOrder: (orderId: string, expiryMinutes?: number) => Promise<boolean>;
  confirmUpi: (orderId: string, upiTransactionId: string) => Promise<boolean>;
}

const AdminOrdersContext = createContext<AdminOrdersContextType | undefined>(undefined);

export function AdminOrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lastMessage } = useWebSocketContext();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/admin/orders`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setError('Failed to load orders');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    if (lastMessage) {
      fetchOrders();
    }
  }, [lastMessage, fetchOrders]);

  const retryOrder = async (orderId: string, expiryMinutes: number = 1440): Promise<boolean> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/admin/orders/${orderId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiryMinutes }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrders();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const confirmUpi = async (orderId: string, upiTransactionId: string): Promise<boolean> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/admin/orders/${orderId}/confirm-upi`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upiTransactionId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrders();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AdminOrdersContext.Provider
      value={{
        orders,
        loading,
        error,
        fetchOrders,
        retryOrder,
        confirmUpi,
      }}
    >
      {children}
    </AdminOrdersContext.Provider>
  );
}

export function useAdminOrders() {
  const context = useContext(AdminOrdersContext);
  if (!context) {
    throw new Error('useAdminOrders must be used within AdminOrdersProvider');
  }
  return context;
}
