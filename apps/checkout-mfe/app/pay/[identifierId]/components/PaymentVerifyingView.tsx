'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCheckoutSession } from '@/context/CheckoutContext';
import { Loader2, AlertCircle, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';

export function PaymentVerifyingView() {
  const { order, pricing, verificationError, verifyRazorpayPayment, setStep } = useCheckoutSession();
  const [retrying, setRetrying] = useState(false);

  const total = order?.totalAmount || pricing?.totalAmount || 0;

  const handleRetry = async () => {
    try {
      setRetrying(true);
      await verifyRazorpayPayment();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Card className="border border-gold-600 bg-white shadow-sm">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 text-gold-700 flex items-center justify-center mb-2">
          {verificationError ? (
            <AlertCircle className="h-6 w-6 text-red-600" />
          ) : (
            <Loader2 className="h-6 w-6 text-gold-600 animate-spin" />
          )}
        </div>
        <CardTitle className="text-xl">
          {verificationError ? 'Verification Pending' : 'Verifying Payment Capture'}
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          {verificationError
            ? 'We could not immediately verify payment capture from the gateway.'
            : 'Communicating with payment gateway and backend to confirm transaction receipt...'}
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Order ID:</span>
            <span className="font-mono font-semibold text-slate-800">{order?.id}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Program Plan:</span>
            <span className="font-semibold text-gold-700">{order?.programDuration || 'Standard'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Customer Name:</span>
            <span className="font-medium text-slate-800">{order?.customerName || 'Customer'}</span>
          </div>

          <div className="flex justify-between pt-2 text-sm font-bold text-slate-900">
            <span>Amount:</span>
            <span className="text-gold-700">INR {total.toFixed(2)}</span>
          </div>
        </div>

        {verificationError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 space-y-1">
            <p className="font-semibold">Payment Status Notice</p>
            <p>{verificationError}</p>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 py-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>Please keep this window open while verification finishes.</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
        {verificationError ? (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRetry}
              disabled={retrying}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Re-Checking...' : 'Check Status Again'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep('payment_selection')}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Payment Options</span>
            </Button>
          </>
        ) : (
          <div className="text-[11px] text-slate-400">
            Security handshake in progress
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
