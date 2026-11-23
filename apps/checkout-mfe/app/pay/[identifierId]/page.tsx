'use client';

import React from 'react';
import { use } from 'react';
import { GeolocationProvider } from '@/context/GeolocationContext';
import { CheckoutProvider, useCheckoutSession } from '@/context/CheckoutContext';
import { CustomerPrefillForm } from './components/CustomerPrefillForm';
import { LocationGateView } from './components/LocationGateView';
import { AddressAndForeignView } from './components/AddressAndForeignView';
import { PaymentMethodSelector } from './components/PaymentMethodSelector';
import { PaymentStatusScreen } from './components/PaymentStatusScreen';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';

function CheckoutContent() {
  const { step, loading, error } = useCheckoutSession();

  if (loading && step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-white rounded-lg border border-slate-200">
        <Loader2 className="h-8 w-8 text-gold-600 animate-spin" />
        <span className="text-sm font-medium text-slate-600">Loading secure checkout session...</span>
      </div>
    );
  }

  if (error && step === 'loading') {
    return (
      <Card className="border border-red-600 bg-white">
        <CardHeader>
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Unable to Load Payment Request</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (step === 'expired') {
    return (
      <Card className="border border-red-600 bg-white">
        <CardHeader>
          <div className="flex items-center space-x-2 text-red-600">
            <Clock className="h-5 w-5" />
            <CardTitle>Payment Request Link Expired</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            This payment link has reached its validity period. Please contact the administrator to re-enable or retry this payment request.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === 'customer_details') return <CustomerPrefillForm />;
  if (step === 'location_gate') return <LocationGateView />;
  if (step === 'address_review') return <AddressAndForeignView />;
  if (step === 'payment_selection') return <PaymentMethodSelector />;
  if (step === 'success') return <PaymentStatusScreen />;

  return null;
}

export default function CheckoutPage({ params }: { params: Promise<{ identifierId: string }> }) {
  const resolvedParams = use(params);

  return (
    <GeolocationProvider>
      <CheckoutProvider identifierId={resolvedParams.identifierId}>
        <CheckoutContent />
      </CheckoutProvider>
    </GeolocationProvider>
  );
}
