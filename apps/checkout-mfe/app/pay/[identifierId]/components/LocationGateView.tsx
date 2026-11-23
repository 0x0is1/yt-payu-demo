'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGeolocationState } from '@/context/GeolocationContext';
import { useCheckoutSession } from '@/context/CheckoutContext';
import { LocationBlocked } from './LocationBlocked';
import { MapPin, ShieldCheck, Globe, Loader2 } from 'lucide-react';

export function LocationGateView() {
  const { status, requestPermission, manualSetForeign } = useGeolocationState();
  const { updatePricing, setStep } = useCheckoutSession();

  if (status === 'denied' || status === 'unavailable') {
    return <LocationBlocked />;
  }

  const handleForeignBypass = async () => {
    manualSetForeign(true);
    await updatePricing('International', 'United States', true);
    setStep('address_review');
  };

  return (
    <Card className="border border-gold-600 bg-white">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 text-gold-700 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Verify Your State for GST</CardTitle>
            <CardDescription>
              Government of India tax regulations require determining your state of residence to calculate CGST + SGST vs IGST.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>State Auto-Resolution</span>
          </div>
          <p className="text-xs text-slate-600">
            Your GPS coordinates are securely resolved to your state name via backend reverse geocoding. The state field will be locked and cannot be edited manually.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            onClick={requestPermission}
            disabled={status === 'requesting'}
            className="w-full flex items-center justify-center space-x-2 py-3"
          >
            {status === 'requesting' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Requesting Browser Location...</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span>Allow Location Access</span>
              </>
            )}
          </Button>

          <div className="text-center">
            <span className="text-xs text-slate-400 uppercase font-semibold">Or</span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleForeignBypass}
            className="w-full flex items-center justify-center space-x-2 py-2 text-xs"
          >
            <Globe className="h-4 w-4 text-orangeAccent-600" />
            <span>Foreign / International Customer (0% GST)</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
