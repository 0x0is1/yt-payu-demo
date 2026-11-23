'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useGeolocationState } from './GeolocationContext';

export interface OrderData {
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
  expiresAt: string;
}

export interface PricingData {
  baseAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  razorpayFee: number;
  razorpayTotal: number;
  isForeign: boolean;
  taxType: string;
  availableMethods: ('razorpay' | 'manual_upi')[];
}

export type CheckoutStep =
  | 'loading'
  | 'expired'
  | 'customer_details'
  | 'location_gate'
  | 'address_review'
  | 'payment_selection'
  | 'success';

interface CheckoutContextType {
  identifierId: string;
  order: OrderData | null;
  pricing: PricingData | null;
  step: CheckoutStep;
  merchantUpiId: string;
  merchantState: string;
  loading: boolean;
  error: string | null;
  setStep: (step: CheckoutStep) => void;
  fetchOrder: () => Promise<void>;
  updatePricing: (state?: string, country?: string, isForeign?: boolean) => Promise<void>;
  submitCustomer: (data: any) => Promise<boolean>;
  initiateRazorpayPayment: () => Promise<string | null>;
  submitUpiPaid: () => Promise<boolean>;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export function CheckoutProvider({
  identifierId,
  children,
}: {
  identifierId: string;
  children: React.ReactNode;
}) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [step, setStep] = useState<CheckoutStep>('loading');
  const [merchantUpiId, setMerchantUpiId] = useState<string>('payu-demo@okhdfcbank');
  const [merchantState, setMerchantState] = useState<string>('Karnataka');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { status: geoStatus, location } = useGeolocationState();

  const fetchConfig = useCallback(async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/config`);
      const data = await res.json();
      if (data.merchantUpiId) setMerchantUpiId(data.merchantUpiId);
      if (data.merchantState) setMerchantState(data.merchantState);
    } catch {}
  }, []);

  const updatePricing = useCallback(
    async (stateParam?: string, countryParam?: string, isForeignParam?: boolean) => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await fetch(`${backendUrl}/api/orders/${identifierId}/calculate-pricing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: stateParam,
            country: countryParam,
            isForeign: isForeignParam,
          }),
        });
        const data = await res.json();
        if (data.success && data.pricing) {
          setPricing(data.pricing);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to calculate live pricing');
      }
    },
    [identifierId]
  );

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/orders/${identifierId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error || 'Payment request not found or expired');
        setLoading(false);
        return;
      }

      const fetchedOrder: OrderData = data.order;
      setOrder(fetchedOrder);

      if (data.isExpired || fetchedOrder.status === 'expired') {
        setStep('expired');
        setLoading(false);
        return;
      }

      if (fetchedOrder.status === 'paid') {
        setStep('success');
        setLoading(false);
        return;
      }

      await updatePricing(fetchedOrder.state || undefined, fetchedOrder.country || undefined, fetchedOrder.isForeign || false);

      const hasCustomerInfo = Boolean(fetchedOrder.customerName && fetchedOrder.customerName.trim().length > 0);
      if (!hasCustomerInfo) {
        setStep('customer_details');
      } else {
        setStep('location_gate');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading order');
    } finally {
      setLoading(false);
    }
  }, [identifierId, updatePricing]);

  useEffect(() => {
    fetchConfig();
    fetchOrder();
  }, [fetchConfig, fetchOrder]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('status') === 'success') {
        setStep('success');
      }
    }
  }, []);

  useEffect(() => {
    if (step === 'location_gate' && geoStatus === 'granted' && location) {
      updatePricing(location.state, location.country, location.isForeign);
      setStep('address_review');
    }
  }, [step, geoStatus, location, updatePricing]);

  const submitCustomer = async (data: any): Promise<boolean> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/orders/${identifierId}/customer-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (resData.success) {
        setOrder(resData.order);
        if (resData.pricing) setPricing(resData.pricing);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const initiateRazorpayPayment = async (): Promise<string | null> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/orders/${identifierId}/razorpay-link`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.paymentLinkUrl) {
        return data.paymentLinkUrl;
      }
      throw new Error(data?.error || 'Failed to initialize Razorpay checkout session');
    } catch (err: any) {
      throw err;
    }
  };

  const submitUpiPaid = async (): Promise<boolean> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/orders/${identifierId}/mark-upi-paid`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setStep('success');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <CheckoutContext.Provider
      value={{
        identifierId,
        order,
        pricing,
        step,
        merchantUpiId,
        merchantState,
        loading,
        error,
        setStep,
        fetchOrder,
        updatePricing,
        submitCustomer,
        initiateRazorpayPayment,
        submitUpiPaid,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckoutSession() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckoutSession must be used within CheckoutProvider');
  }
  return context;
}
