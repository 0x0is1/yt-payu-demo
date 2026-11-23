'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ExternalLink, PlusCircle } from 'lucide-react';

interface GeneratedLinkCardProps {
  data: any;
  onReset: () => void;
}

export function GeneratedLinkCard({ data, onReset }: GeneratedLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const paymentLink = data?.paymentLink || '';
  const order = data?.order || {};
  const pricing = data?.pricing || {};

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  };

  return (
    <Card className="border border-emerald-600 bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-900">Payment Link Generated</CardTitle>
          <Badge variant="success">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-amber-50 border border-gold-600 p-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-gold-700 block mb-1">
            Checkout URL (Public Token)
          </label>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm text-slate-800 truncate select-all">
              {paymentLink}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-shrink-0 flex items-center space-x-1"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded border border-slate-200 p-3 bg-slate-50">
            <span className="text-xs text-slate-500 uppercase block">Order ID</span>
            <span className="font-mono text-sm font-semibold text-slate-900">{order.id}</span>
          </div>

          <div className="rounded border border-slate-200 p-3 bg-slate-50">
            <span className="text-xs text-slate-500 uppercase block">Base Amount</span>
            <span className="text-sm font-semibold text-slate-900">INR {pricing.baseAmount?.toFixed(2)}</span>
          </div>

          <div className="rounded border border-slate-200 p-3 bg-slate-50">
            <span className="text-xs text-slate-500 uppercase block">GST Rate</span>
            <span className="text-sm font-semibold text-slate-900">{pricing.gstRate}%</span>
          </div>

          <div className="rounded border border-slate-200 p-3 bg-slate-50">
            <span className="text-xs text-slate-500 uppercase block">Est. Total</span>
            <span className="text-sm font-bold text-gold-600">INR {pricing.totalAmount?.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center gap-3">
        <Button variant="outline" onClick={onReset} className="flex items-center space-x-1">
          <PlusCircle className="h-4 w-4" />
          <span>Generate Another</span>
        </Button>

        <a
          href={paymentLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium rounded-md bg-gold-600 text-white hover:bg-gold-700 transition-colors"
        >
          <span>Open Checkout Page</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      </CardFooter>
    </Card>
  );
}
