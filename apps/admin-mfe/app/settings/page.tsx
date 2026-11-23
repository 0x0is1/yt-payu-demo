'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { SettingsForm } from './components/SettingsForm';
import { TestCredentialsCard } from './components/TestCredentialsCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Settings } from 'lucide-react';

export default function SettingsPage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm text-slate-500 font-medium">Verifying administrator session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center space-x-2 text-slate-800">
              <Lock className="h-5 w-5 text-gold-600" />
              <CardTitle>Authentication Required</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Merchant settings and credential management require administrator authentication.
            </p>
            <Link href="/login">
              <Button className="w-full">Sign In to Continue</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6 text-gold-600" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Merchant Settings & System Configuration
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettingsForm />
        <TestCredentialsCard />
      </div>
    </div>
  );
}
