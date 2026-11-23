'use client';

import React, { useState } from 'react';
import { GeneratorForm } from './components/GeneratorForm';
import { GeneratedLinkCard } from './components/GeneratedLinkCard';

export default function AdminLinkGeneratorPage() {
  const [generatedData, setGeneratedData] = useState<any>(null);

  const handleSuccess = (result: any) => {
    setGeneratedData(result);
  };

  const handleReset = () => {
    setGeneratedData(null);
  };

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
