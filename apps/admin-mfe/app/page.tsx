'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { GeneratorForm } from './components/GeneratorForm';
import { GeneratedLinkCard } from './components/GeneratedLinkCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export default function AdminLinkGeneratorPage() {
  const { isAuthenticated, loading } = useAuth();
  const [generatedData, setGeneratedData] = useState<any>(null);

  const handleSuccess = (result: any) => {
    setGeneratedData(result);
  };

  const handleReset = () => {
    setGeneratedData(null);
  };

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
              Generating payment links requires administrator authentication. Please sign in to access the generator.
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
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Payment Request Generator
        </h1>
        <p className="text-sm text-slate-500">
          Create and sync dynamic payment links with Indian GST calculations and multiple payment methods.
        </p>
      </div>

      {generatedData ? (
        <GeneratedLinkCard data={generatedData} onReset={handleReset} />
      ) : (
        <GeneratorForm onSuccess={handleSuccess} />
      )}
    </div>
  );
}
