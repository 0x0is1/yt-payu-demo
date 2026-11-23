'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCheckoutSession } from '@/context/CheckoutContext';
import { useGeolocationState } from '@/context/GeolocationContext';
import { Lock, Globe, MapPin, ArrowRight } from 'lucide-react';

export function AddressAndForeignView() {
  const { order, pricing, updatePricing, submitCustomer, setStep } = useCheckoutSession();
  const { status: geoStatus, location, manualSetForeign } = useGeolocationState();

  const [building, setBuilding] = useState(order?.addressLine || '');
  const [city, setCity] = useState(order?.city || location?.city || '');
  const [isForeign, setIsForeign] = useState<boolean>(Boolean(order?.isForeign || location?.isForeign));
  const [submitting, setSubmitting] = useState(false);

  const resolvedState = isForeign ? 'International' : (location?.state || order?.state || 'Karnataka');
  const resolvedCountry = isForeign ? 'United States' : (location?.country || order?.country || 'India');

  const handleToggleForeign = async () => {
    if (isForeign) {
      manualSetForeign(false);
      setIsForeign(false);
      if (geoStatus !== 'granted' || !location?.latitude) {
        setStep('location_gate');
        return;
      }
      await updatePricing(location.state || 'Karnataka', 'India', false);
    } else {
      setIsForeign(true);
      manualSetForeign(true);
      await updatePricing('International', 'United States', true);
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isForeign && (geoStatus !== 'granted' || !location?.latitude)) {
      setStep('location_gate');
      return;
    }
    setSubmitting(true);

    const actualState = isForeign ? 'International' : (location?.state || order?.state || 'Karnataka');
    const actualCountry = isForeign ? 'United States' : 'India';

    await submitCustomer({
      customerName: order?.customerName || 'Customer',
      customerEmail: order?.customerEmail,
      customerPhone: order?.customerPhone,
      addressLine: building.trim() || undefined,
      city: city.trim() || undefined,
      state: actualState,
      country: actualCountry,
      isForeign,
      nationality: isForeign ? 'International' : 'Indian',
      latitude: isForeign ? null : location?.latitude,
      longitude: isForeign ? null : location?.longitude,
    });

    setSubmitting(false);
    setStep('payment_selection');
  };

  return (
    <Card className="border border-gold-600 bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-gold-600" />
            <CardTitle>Delivery & Billing Address</CardTitle>
          </div>
          <Badge variant={isForeign ? 'orange' : 'gold'}>
            {isForeign ? 'International / Foreign' : 'Domestic Indian'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleContinue} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-orangeAccent-600" />
              <div className="text-xs">
                <span className="font-semibold text-slate-900 block">Nationality Declaration</span>
                <span className="text-slate-500">
                  {isForeign ? 'Zero-rated export of services (0% GST)' : 'Domestic supply subject to Indian GST'}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant={isForeign ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleToggleForeign}
              className="text-xs"
            >
              {isForeign ? 'Switch to Indian Domestic' : 'I am a Foreign Customer'}
            </Button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="building">Building / Flat / Street</Label>
            <Input
              id="building"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="Apartment, building, street address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bengaluru"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="state">State (Disabled - Geo-Locked)</Label>
                <Lock className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <Input
                id="state"
                value={resolvedState}
                disabled={true}
                className="bg-slate-100 font-semibold text-slate-700 cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-500 block">
                Derived securely from browser coordinates for GST compliance.
              </span>
            </div>
          </div>

          {pricing && (
            <div className="rounded-lg bg-amber-50 border border-gold-600 p-3 space-y-1.5 text-xs text-slate-800">
              <div className="flex justify-between">
                <span>Base Fee:</span>
                <span>INR {pricing.baseAmount.toFixed(2)}</span>
              </div>
              {pricing.isForeign ? (
                <div className="flex justify-between font-medium text-emerald-800">
                  <span>Export Supply GST:</span>
                  <span>0% (Zero-Rated)</span>
                </div>
              ) : (
                <>
                  {pricing.igst > 0 ? (
                    <div className="flex justify-between">
                      <span>IGST ({pricing.gstRate}% Inter-State):</span>
                      <span>INR {pricing.igst.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span>CGST + SGST ({pricing.gstRate}% Intra-State):</span>
                      <span>INR {(pricing.cgst + pricing.sgst).toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between pt-1 font-bold text-sm text-gold-700">
                <span>Total Payable:</span>
                <span>INR {pricing.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center space-x-2 py-2.5"
            >
              <span>{submitting ? 'Updating...' : 'Proceed to Payment Options'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
