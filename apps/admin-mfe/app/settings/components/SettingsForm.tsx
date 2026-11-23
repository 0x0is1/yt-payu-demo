'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Save, CheckCircle2, AlertCircle, Building2, QrCode, Shield, Percent } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface SettingsFormProps {
  onSettingsChange?: (settings: any) => void;
}

export function SettingsForm({ onSettingsChange }: SettingsFormProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [merchantName, setMerchantName] = useState('PayU Merchant Store');
  const [merchantUpiId, setMerchantUpiId] = useState('payu-demo@okhdfcbank');
  const [merchantState, setMerchantState] = useState('Karnataka');
  const [defaultGstRate, setDefaultGstRate] = useState<number>(18);
  const [razorpayKeyId, setRazorpayKeyId] = useState('rzp_test_2xGYyaqTbp0HNw');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('Bj7via42B9PX6GS38kQM6fVq');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('rzp_webhook_secret_key');

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/settings`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setMerchantName(data.settings.merchantName || 'PayU Merchant Store');
          setMerchantUpiId(data.settings.merchantUpiId || 'payu-demo@okhdfcbank');
          setMerchantState(data.settings.merchantState || 'Karnataka');
          setDefaultGstRate(data.settings.defaultGstRate ?? 18);
          setRazorpayKeyId(data.settings.razorpayKeyId || '');
          setRazorpayKeySecret(data.settings.razorpayKeySecret || '');
          setRazorpayWebhookSecret(data.settings.razorpayWebhookSecret || '');
          if (onSettingsChange) onSettingsChange(data.settings);
        }
      })
      .catch((err) => {
        setMessage({ type: 'error', text: `Failed to load settings: ${err.message}` });
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          merchantName,
          merchantUpiId,
          merchantState,
          defaultGstRate: Number(defaultGstRate),
          razorpayKeyId,
          razorpayKeySecret,
          razorpayWebhookSecret,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setMessage({ type: 'success', text: 'Merchant settings updated and saved to database successfully' });
      if (onSettingsChange) onSettingsChange(data.settings);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error updating settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Loading merchant configuration...</p>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle>Merchant Profile & Credentials</CardTitle>
        <CardDescription>
          Configure merchant details, home state for GST calculation, and Razorpay API keys.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {message && (
            <div
              className={`p-3 rounded text-xs border flex items-center space-x-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="merchant-name" className="flex items-center space-x-1">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                <span>Merchant Store Name</span>
              </Label>
              <Input
                id="merchant-name"
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="merchant-upi" className="flex items-center space-x-1">
                <QrCode className="h-3.5 w-3.5 text-slate-500" />
                <span>Merchant UPI ID (VPA)</span>
              </Label>
              <Input
                id="merchant-upi"
                type="text"
                value={merchantUpiId}
                onChange={(e) => setMerchantUpiId(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="merchant-state">Merchant Home State (GST Registered)</Label>
              <Input
                id="merchant-state"
                type="text"
                value={merchantState}
                onChange={(e) => setMerchantState(e.target.value)}
                placeholder="e.g. Karnataka"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="default-gst-rate" className="flex items-center space-x-1">
                <Percent className="h-3.5 w-3.5 text-slate-500" />
                <span>Default GST Rate</span>
              </Label>
              <Select
                id="default-gst-rate"
                value={String(defaultGstRate)}
                onChange={(e) => setDefaultGstRate(Number(e.target.value))}
              >
                <option value="18">18% Standard Services Slab</option>
                <option value="5">5% Concessional Slab</option>
                <option value="0">0% Non-Taxable / Exempt</option>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-slate-800">
              <Shield className="h-4 w-4 text-gold-600" />
              <span>Razorpay Production / Test Credentials</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rzp-key-id">Razorpay Key ID</Label>
              <Input
                id="rzp-key-id"
                type="text"
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
                placeholder="rzp_test_..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rzp-key-secret">Razorpay Key Secret</Label>
                <Input
                  id="rzp-key-secret"
                  type="password"
                  value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  placeholder="Enter secret key"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rzp-webhook-secret">Webhook Signing Secret</Label>
                <Input
                  id="rzp-webhook-secret"
                  type="password"
                  value={razorpayWebhookSecret}
                  onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                  placeholder="Enter webhook secret"
                  required
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center space-x-2 px-6 py-2.5 font-semibold"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
