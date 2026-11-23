'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Send } from 'lucide-react';

interface GeneratorFormProps {
  onSuccess: (result: any) => void;
}

export function GeneratorForm({ onSuccess }: GeneratorFormProps) {
  const [amount, setAmount] = useState<string>('1000');
  const [orderId, setOrderId] = useState<string>(() => generateRandomOrderId());
  const [gstRate, setGstRate] = useState<number>(18);
  const [expiryMinutes, setExpiryMinutes] = useState<number>(1440);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [addressLine, setAddressLine] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [nationality, setNationality] = useState<string>('Indian');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  function generateRandomOrderId() {
    return `ORD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  const handleRefreshOrderId = () => {
    setOrderId(generateRandomOrderId());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
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
          gstRate,
          expiryMinutes,
          customerName: customerName.trim() || undefined,
          customerEmail: customerEmail.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          addressLine: addressLine.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          nationality: nationality.trim() || 'Indian',
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
    <Card className="border border-gold-600">
      <CardHeader>
        <CardTitle>Generate Payment Request Link</CardTitle>
        <CardDescription>
          Enter the order details, tax slab, and optional customer information to generate a checkout link.
        </CardDescription>
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
              <Label htmlFor="amount">Base Amount (INR) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000.00"
                required
              />
            </div>

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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="gstRate">Services GST Tax Slab *</Label>
              <Select
                id="gstRate"
                value={gstRate.toString()}
                onChange={(e) => setGstRate(Number(e.target.value))}
              >
                <option value="18">18% (Standard Digital / Commercial Services)</option>
                <option value="5">5% (Concessional / Transport Services)</option>
                <option value="0">0% (Exempt Services)</option>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="expiry">Link Validity Period *</Label>
              <Select
                id="expiry"
                value={expiryMinutes.toString()}
                onChange={(e) => setExpiryMinutes(Number(e.target.value))}
              >
                <option value="30">30 Minutes</option>
                <option value="120">2 Hours</option>
                <option value="1440">24 Hours (Default)</option>
                <option value="10080">7 Days</option>
              </Select>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Optional Customer Prefill Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="customerEmail">Email Address</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="rahul@example.com"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="addressLine">Street Address</Label>
                <Input
                  id="addressLine"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Building, street, flat"
                />
              </div>

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
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Karnataka"
                />
              </div>
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
