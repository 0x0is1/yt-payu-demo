'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, Mail, ShieldAlert, KeyRound } from 'lucide-react';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@payflow.internal');
  const [password, setPassword] = useState('AdminPassword123!');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || 'Authentication failed');
      setSubmitting(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('admin@payflow.internal');
    setPassword('AdminPassword123!');
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-gold-600 text-white font-bold flex items-center justify-center text-base">
              P
            </div>
            <div>
              <CardTitle>Merchant Administrator Login</CardTitle>
              <CardDescription>
                Sign in to manage payment link generation, requests, and gateway settings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded bg-red-50 p-2.5 text-xs text-red-700 border border-red-200 flex items-center space-x-2">
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Admin Email or Username</Label>
              <div className="relative">
                <Input
                  id="admin-email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@payflow.internal"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center space-x-2 py-2.5 font-semibold"
            >
              <Lock className="h-4 w-4" />
              <span>{submitting ? 'Verifying...' : 'Sign In as Administrator'}</span>
            </Button>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-900 flex items-center space-x-1">
                  <KeyRound className="h-3.5 w-3.5 text-gold-600" />
                  <span>Fixed Administrator Credentials:</span>
                </span>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-[11px] text-gold-700 underline font-semibold hover:text-gold-800"
                >
                  Quick Fill
                </button>
              </div>
              <div className="font-mono text-xs text-slate-700 space-y-0.5">
                <div>Email: <strong className="text-slate-900">admin@payflow.internal</strong></div>
                <div>Password: <strong className="text-slate-900">AdminPassword123!</strong></div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
