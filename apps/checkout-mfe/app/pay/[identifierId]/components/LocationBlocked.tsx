'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGeolocationState } from '@/context/GeolocationContext';
import { useCheckoutSession } from '@/context/CheckoutContext';
import { MapPinOff, RefreshCw, Globe, AlertTriangle } from 'lucide-react';

export function LocationBlocked() {
  const { requestPermission, manualSetForeign } = useGeolocationState();
  const { updatePricing, setStep } = useCheckoutSession();

  const handleForeignBypass = async () => {
    manualSetForeign(true);
    await updatePricing('International', 'United States', true);
    setStep('address_review');
  };

  return (
    <Card className="border border-red-600 bg-white">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
            <MapPinOff className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-red-900">Location Access Blocked</CardTitle>
            <p className="text-xs text-red-700 mt-0.5">
              Location permission is required for Indian GST tax compliance.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-xs text-red-800 space-y-2">
          <div className="flex items-center space-x-1.5 font-semibold text-red-900">
            <AlertTriangle className="h-4 w-4" />
            <span>How to enable location in your browser:</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1 text-slate-700">
            <li>Click the <strong>tune / lock icon</strong> on the left side of your browser address bar.</li>
            <li>Locate <strong>Location</strong> in the permissions list and change it to <strong>Allow</strong>.</li>
            <li>Click the button below to re-verify your location.</li>
          </ol>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={requestPermission}
            className="w-full flex items-center justify-center space-x-2 py-2.5"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Re-verify Location Permission</span>
          </Button>

          <div className="text-center py-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Or</span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleForeignBypass}
            className="w-full flex items-center justify-center space-x-2 py-2 text-xs"
          >
            <Globe className="h-4 w-4 text-orangeAccent-600" />
            <span>I am a Foreign / International Customer</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
