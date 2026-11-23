'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Send, Sparkles } from 'lucide-react';

interface GeneratorFormProps {
  onSuccess: (result: any) => void;
}

export function GeneratorForm({ onSuccess }: GeneratorFormProps) {
  const [amount, setAmount] = useState<string>('1000');
  const [programDuration, setProgramDuration] = useState<string>('1 Month');
  const [orderId, setOrderId] = useState<string>('');
  const [expiryMinutes, setExpiryMinutes] = useState<number>(1440);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNextOrderId = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/orders/next-id`);
      if (res.ok) {
        const data = await res.json();
        if (data.nextOrderId) {
          setOrderId(data.nextOrderId);
        }
      }
    } catch {
      return;
    }
  };

  useEffect(() => {
    fetchNextOrderId();
  }, []);

  const handleRefreshOrderId = () => {
    fetchNextOrderId();
  };

  const handleDurationChange = (val: string) => {
    setProgramDuration(val);
    if (val === 'Free Trial') {
      setAmount('0');
    } else if (amount === '0') {
      setAmount('1000');
    }
  };

  const isTrial = programDuration === 'Free Trial';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/orders/generate-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId.trim() || undefined,
          baseAmount: numAmount,
          programDuration,
          isFreeTrial: isTrial,
          expiryMinutes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.errors ? JSON.stringify(data.errors) : data?.error || 'Failed to generate link');
        return;
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-gold-600 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Generate Payment Request Link</CardTitle>
            <CardDescription>
              Set amount, program duration or trial, and validity. Taxes and customer info are dynamically calculated on member checkout.
            </CardDescription>
          </div>
          {isTrial && (
            <div className="rounded-full bg-amber-100 border border-gold-600 px-3 py-1 flex items-center space-x-1.5 text-xs font-semibold text-gold-800">
              <Sparkles className="h-3.5 w-3.5 text-gold-600" />
              <span>Trial Mode</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="programDuration">Program Duration / Plan *</Label>
              <Select
                id="programDuration"
                value={programDuration}
                onChange={(e) => handleDurationChange(e.target.value)}
              >
                <option value="Free Trial">Free Trial</option>
                <option value="1 Month">1 Month</option>
                <option value="2 Months">2 Months</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="12 Months">12 Months</option>
              </Select>
              <span className="text-[11px] text-slate-500 block">
                Select whether this request is for a free trial or paid program enrollment.
              </span>
            </div>

            <div className="space-y-1">
              <Label htmlFor="amount">Base Amount (INR) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000.00"
                disabled={isTrial}
                required
              />
              <span className="text-[11px] text-slate-500 block">
                {isTrial ? 'Free trial amount is set to 0.00 INR' : 'Exclusive of location-based taxes calculated dynamically.'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="orderId">Order ID (Auto-Synced)</Label>
                <button
                  type="button"
                  onClick={handleRefreshOrderId}
                  className="text-xs text-gold-600 hover:text-gold-700 flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Regenerate</span>
                </button>
              </div>
              <Input
                id="orderId"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Auto-generated if blank"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="expiry">Link Validity Period *</Label>
              <Select
                id="expiry"
                value={expiryMinutes.toString()}
                onChange={(e) => setExpiryMinutes(Number(e.target.value))}
              >
                <option value="0">No Expiry (Never Expires)</option>
                <option value="30">30 Minutes</option>
                <option value="120">2 Hours</option>
                <option value="1440">24 Hours (Default)</option>
                <option value="10080">7 Days</option>
              </Select>
              <span className="text-[11px] text-slate-500 block">
                Select how long this checkout link remains accessible to the member.
              </span>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5"
            >
              <Send className="h-4 w-4" />
              <span>{loading ? 'Generating...' : 'Generate Pay Link'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
