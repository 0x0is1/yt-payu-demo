'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCheckoutSession } from '@/context/CheckoutContext';
import { ArrowRight, User } from 'lucide-react';

export function CustomerPrefillForm() {
  const { order, setStep } = useCheckoutSession();
  const [name, setName] = useState(order?.customerName || '');
  const [email, setEmail] = useState(order?.customerEmail || '');
  const [phone, setPhone] = useState(order?.customerPhone || '');
  const [error, setError] = useState<string | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name to proceed');
      return;
    }
    setStep('location_gate');
  };

  return (
    <Card className="border border-gold-600 bg-white">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-amber-100 text-gold-700 flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>
              Please enter your contact details before proceeding to payment.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleNext} className="space-y-4">
          {error && (
            <div className="rounded bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="custName">Full Name *</Label>
            <Input
              id="custName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="custEmail">Email Address</Label>
            <Input
              id="custEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="custPhone">Phone Number</Label>
            <Input
              id="custPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full flex items-center justify-center space-x-1.5 py-2.5">
              <span>Continue to Verification</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
