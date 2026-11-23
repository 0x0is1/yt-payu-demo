'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCheckoutSession } from '@/context/CheckoutContext';
import { CheckCircle2, Clock, ShieldCheck, Printer } from 'lucide-react';

export function PaymentStatusScreen() {
  const { order, pricing } = useCheckoutSession();

  const isConfirmed = order?.status === 'paid';
  const isUpiClaimed = order?.status === 'upi_claimed';

  const total = order?.totalAmount || pricing?.totalAmount || 0;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Card className="border border-emerald-600 bg-white">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
          {isConfirmed ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6 text-gold-600" />}
        </div>
        <CardTitle className="text-xl">
          {isConfirmed ? 'Payment Successful' : 'Payment Acknowledged'}
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          {isConfirmed
            ? 'Your payment was captured and confirmed by the merchant system.'
            : 'Your UPI payment claim has been submitted. The admin will verify receipt against your bank reference.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
          <div className="flex justify-between items-center pb-2">
            <span className="text-slate-500 uppercase font-semibold">Payment Status</span>
            <Badge variant={isConfirmed ? 'success' : 'orange'}>
              {isConfirmed ? 'Paid / Confirmed' : 'Verification Pending'}
            </Badge>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Order ID:</span>
            <span className="font-mono font-semibold text-slate-800">{order?.id}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Customer Name:</span>
            <span className="font-medium text-slate-800">{order?.customerName || 'Customer'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Billing Region:</span>
            <span className="text-slate-800">{order?.state || 'Verified'}, {order?.country || 'India'}</span>
          </div>

          {order?.paymentMethod && (
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Platform:</span>
              <span className="font-semibold uppercase text-slate-800">{order.paymentMethod}</span>
            </div>
          )}

          {order?.razorpayPaymentId && (
            <div className="flex justify-between">
              <span className="text-slate-500">Razorpay Payment ID:</span>
              <span className="font-mono text-slate-800">{order.razorpayPaymentId}</span>
            </div>
          )}

          {order?.upiTransactionId && (
            <div className="flex justify-between">
              <span className="text-slate-500">UPI Transaction Ref:</span>
              <span className="font-mono text-slate-800">{order.upiTransactionId}</span>
            </div>
          )}

          <div className="flex justify-between pt-2 text-sm font-bold text-slate-900">
            <span>Total Amount:</span>
            <span className="text-gold-700">INR {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Receipt synchronized with PayU Merchant Gateway</span>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center pt-2">
        <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center space-x-1.5 text-xs">
          <Printer className="h-4 w-4" />
          <span>Print / Save Receipt</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
