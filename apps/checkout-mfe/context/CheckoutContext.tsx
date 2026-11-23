'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useGeolocationState } from './GeolocationContext';

export interface OrderData {
  id: string;
  identifierId: string;
  baseAmount: number;
  programDuration?: string;
  isFreeTrial?: boolean;
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
  bankReferenceId?: string | null;
  expiresAt?: string | null;
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
  isFreeTrial: boolean;
  taxType: string;
  availableMethods: ('razorpay' | 'upi' | 'bank_transfer')[];
}

export interface RazorpaySessionResult {
  orderId?: string;
  keyId?: string;
  amount?: number;
  paymentLinkUrl?: string;
}

export type CheckoutStep =
  | 'loading'
  | 'expired'
  | 'customer_details'
  | 'location_gate'
  | 'address_review'
  | 'payment_selection'
  | 'verifying_payment'
  | 'success';

interface CheckoutContextType {
  identifierId: string;
  order: OrderData | null;
  pricing: PricingData | null;
  step: CheckoutStep;
  merchantUpiId: string;
  merchantState: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankAccountName: string;
  bankName: string;
  loading: boolean;
  error: string | null;
  verificationError: string | null;
  setStep: (step: CheckoutStep) => void;
  fetchOrder: () => Promise<void>;
  updatePricing: (state?: string, country?: string, isForeign?: boolean) => Promise<void>;
  submitCustomer: (data: any) => Promise<boolean>;
  initiateRazorpayPayment: () => Promise<RazorpaySessionResult>;
  verifyRazorpayPayment: (paymentIdParam?: string, orderIdParam?: string, signatureParam?: string) => Promise<boolean>;
  submitUpiPaid: () => Promise<boolean>;
  submitBankPaid: (bankReferenceId?: string) => Promise<boolean>;
  activateTrial: () => Promise<boolean>;
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
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('919876543210');
  const [bankIfsc, setBankIfsc] = useState<string>('HDFC0001234');
  const [bankAccountName, setBankAccountName] = useState<string>('PayU Merchant Store Private Limited');
  const [bankName, setBankName] = useState<string>('HDFC Bank');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const { status: geoStatus, location } = useGeolocationState();

  const fetchConfig = useCallback(async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/config`);
      const data = await res.json();
      if (data.merchantUpiId) setMerchantUpiId(data.merchantUpiId);
      if (data.merchantState) setMerchantState(data.merchantState);
      if (data.bankAccountNumber) setBankAccountNumber(data.bankAccountNumber);
      if (data.bankIfsc) setBankIfsc(data.bankIfsc);
      if (data.bankAccountName) setBankAccountName(data.bankAccountName);
      if (data.bankName) setBankName(data.bankName);
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

      if (fetchedOrder.status === 'paid') {
        setStep('success');
        setLoading(false);
        return;
      }

      const isExpired = fetchedOrder.expiresAt
        ? new Date(fetchedOrder.expiresAt).getTime() < Date.now()
        : false;

      if (data.isExpired || isExpired || fetchedOrder.status === 'expired') {
        setStep('expired');
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const hasPaymentParams =
          urlParams.get('status') === 'success' ||
          Boolean(urlParams.get('razorpay_payment_id')) ||
          urlParams.get('razorpay_payment_link_status') === 'paid';
        if (hasPaymentParams) {
          setLoading(false);
          return;
        }
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

  const verifyRazorpayPayment = useCallback(
    async (paymentIdParam?: string, orderIdParam?: string, signatureParam?: string): Promise<boolean> => {
      try {
        setVerificationError(null);
        setStep('verifying_payment');
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await fetch(`${backendUrl}/api/orders/${identifierId}/verify-razorpay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: paymentIdParam || undefined,
            orderId: orderIdParam || undefined,
            signature: signatureParam || undefined,
          }),
        });
        const data = await res.json();
        if (data.success && data.order && data.order.status === 'paid') {
          setOrder(data.order);
          setStep('success');
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }
          return true;
        }

        for (let attempt = 1; attempt <= 4; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const checkRes = await fetch(`${backendUrl}/api/orders/${identifierId}`);
          const checkData = await checkRes.json();
          if (checkData.success && checkData.order && checkData.order.status === 'paid') {
            setOrder(checkData.order);
            setStep('success');
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', window.location.pathname);
            }
            return true;
          }
        }

        setVerificationError('Gateway verification is pending. If money was debited, your enrollment will be confirmed shortly.');
        return false;
      } catch (err: any) {
        setVerificationError(err.message || 'Error communicating with verification gateway');
        return false;
      }
    },
    [identifierId]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isSuccess = urlParams.get('status') === 'success';
      const paymentId = urlParams.get('razorpay_payment_id');
      const orderId = urlParams.get('razorpay_order_id');
      const signature = urlParams.get('razorpay_signature');
      const linkStatus = urlParams.get('razorpay_payment_link_status');
      if (isSuccess || paymentId || linkStatus === 'paid') {
        verifyRazorpayPayment(paymentId || undefined, orderId || undefined, signature || undefined);
      }
    }
  }, [identifierId, verifyRazorpayPayment]);

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

  const initiateRazorpayPayment = async (): Promise<RazorpaySessionResult> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/orders/${identifierId}/razorpay-link`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        return {
          orderId: data.orderId,
          keyId: data.keyId,
          amount: data.amount,
          paymentLinkUrl: data.paymentLinkUrl,
        };
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
        if (data.order) setOrder(data.order);
        setStep('success');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const submitBankPaid = async (bankReferenceId?: string): Promise<boolean> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/orders/${identifierId}/mark-bank-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankReferenceId }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.order) setOrder(data.order);
        setStep('success');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const activateTrial = async (): Promise<boolean> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/orders/${identifierId}/activate-trial`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        if (data.order) setOrder(data.order);
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
        bankAccountNumber,
        bankIfsc,
        bankAccountName,
        bankName,
        loading,
        error,
        verificationError,
        setStep,
        fetchOrder,
        updatePricing,
        submitCustomer,
        initiateRazorpayPayment,
        verifyRazorpayPayment,
        submitUpiPaid,
        submitBankPaid,
        activateTrial,
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
