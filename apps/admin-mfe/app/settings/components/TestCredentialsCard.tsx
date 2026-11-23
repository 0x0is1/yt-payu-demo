'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, XCircle, Globe, CreditCard } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function TestCredentialsCard() {
  const { token } = useAuth();
  const [testingRazorpay, setTestingRazorpay] = useState(false);
  const [testingGeocoding, setTestingGeocoding] = useState(false);
  const [razorpayResult, setRazorpayResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [geocodingResult, setGeocodingResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const handleTestRazorpay = async () => {
    setTestingRazorpay(true);
    setRazorpayResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/settings/test-razorpay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      setRazorpayResult(data);
    } catch (err: any) {
      setRazorpayResult({ success: false, message: `Network error: ${err.message}` });
    } finally {
      setTestingRazorpay(false);
    }
  };

  const handleTestGeocoding = async () => {
    setTestingGeocoding(true);
    setGeocodingResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/settings/test-geocoding`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();
      setGeocodingResult(data);
    } catch (err: any) {
      setGeocodingResult({ success: false, message: `Network error: ${err.message}` });
    } finally {
      setTestingGeocoding(false);
    }
  };

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-gold-600" />
          <div>
            <CardTitle>System Connectivity & API Health Verification</CardTitle>
            <CardDescription>
              Test real connections to external third-party services before deploying to production.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-slate-700" />
              <span className="font-semibold text-sm text-slate-900">Razorpay Payment Gateway API</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={testingRazorpay}
              onClick={handleTestRazorpay}
              className="text-xs"
            >
              {testingRazorpay ? 'Verifying...' : 'Test Razorpay Connection'}
            </Button>
          </div>

          {razorpayResult && (
            <div
              className={`rounded p-3 text-xs border space-y-1.5 ${
                razorpayResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-semibold">
                {razorpayResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span>{razorpayResult.message}</span>
              </div>
              {razorpayResult.details && (
                <div className="font-mono text-[11px] text-slate-700">
                  Latency: {razorpayResult.details.latencyMs}ms | Status: {razorpayResult.details.status}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-slate-700" />
              <span className="font-semibold text-sm text-slate-900">OpenStreetMap Nominatim Reverse-Geocoding</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={testingGeocoding}
              onClick={handleTestGeocoding}
              className="text-xs"
            >
              {testingGeocoding ? 'Verifying...' : 'Test Geocoding Service'}
            </Button>
          </div>

          {geocodingResult && (
            <div
              className={`rounded p-3 text-xs border space-y-1.5 ${
                geocodingResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-semibold">
                {geocodingResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span>{geocodingResult.message}</span>
              </div>
              {geocodingResult.details && (
                <div className="font-mono text-[11px] text-slate-700">
                  Latency: {geocodingResult.details.latencyMs}ms | State: {geocodingResult.details.state} | Country: {geocodingResult.details.country}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
