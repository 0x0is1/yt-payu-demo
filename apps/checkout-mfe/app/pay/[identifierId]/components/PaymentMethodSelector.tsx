'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCheckoutSession } from '@/context/CheckoutContext';
import QRCode from 'qrcode';
import { CreditCard, QrCode, Copy, Check, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export function PaymentMethodSelector() {
  const { order, pricing, merchantUpiId, initiateRazorpayPayment, submitUpiPaid } = useCheckoutSession();

  const [selectedMethod, setSelectedMethod] = useState<'razorpay' | 'manual_upi'>('razorpay');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [loadingPay, setLoadingPay] = useState(false);
  const [loadingUpi, setLoadingUpi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isForeign = Boolean(pricing?.isForeign);
  const totalAmount = pricing?.totalAmount || order?.totalAmount || 0;
  const razorpayFee = pricing?.razorpayFee || Math.round(totalAmount * 0.02 * 100) / 100;
  const razorpayTotal = pricing?.razorpayTotal || Math.round((totalAmount + razorpayFee) * 100) / 100;

  useEffect(() => {
    if (isForeign) {
      setSelectedMethod('razorpay');
    }
  }, [isForeign]);

  useEffect(() => {
    if (merchantUpiId && totalAmount && !isForeign) {
      const upiUri = `upi://pay?pa=${merchantUpiId}&pn=PayUDemo&am=${totalAmount.toFixed(2)}&cu=INR&tn=${order?.id || 'OrderPayment'}`;
      QRCode.toDataURL(upiUri, { width: 200, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })
        .then((url) => setQrCodeUrl(url))
        .catch(() => {});
    }
  }, [merchantUpiId, totalAmount, order?.id, isForeign]);

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(merchantUpiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {}
  };

  const handleRazorpayClick = async () => {
    try {
      setLoadingPay(true);
      setError(null);
      const linkUrl = await initiateRazorpayPayment();
      if (linkUrl) {
        window.location.href = linkUrl;
      } else {
        setError('Failed to initialize Razorpay checkout session.');
        setLoadingPay(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error redirecting to payment gateway');
      setLoadingPay(false);
    }
  };

  const handleUpiDoneClick = async () => {
    try {
      setLoadingUpi(true);
      setError(null);
      const success = await submitUpiPaid();
      if (!success) {
        setError('Failed to record UPI payment claim. Please try again.');
        setLoadingUpi(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error confirming UPI payment');
      setLoadingUpi(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border border-gold-600 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Payment Option</CardTitle>
            <Badge variant={isForeign ? 'orange' : 'gold'}>
              {isForeign ? 'Razorpay Only (International)' : 'Dual Options'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {isForeign && (
            <div className="rounded-lg bg-orange-50 border border-orangeAccent-600 p-3 text-xs text-orangeAccent-800 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-orangeAccent-700" />
              <span>
                International customer payment mode: Domestic UPI is disabled for international banking compliance. You can pay securely with international credit/debit cards via Razorpay.
              </span>
            </div>
          )}

          <div className="space-y-3">
            <div
              onClick={() => setSelectedMethod('razorpay')}
              className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                selectedMethod === 'razorpay'
                  ? 'border-gold-600 bg-amber-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block text-sm">
                      Razorpay Gateway
                    </span>
                    <span className="text-xs text-slate-500">
                      Credit/Debit Card, NetBanking, International Cards
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block text-sm">
                    INR {razorpayTotal.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-orangeAccent-600 font-semibold">
                    +2% Gateway Cut applies (INR {razorpayFee.toFixed(2)})
                  </span>
                </div>
              </div>

              {selectedMethod === 'razorpay' && (
                <div className="mt-4 pt-3 space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Order Amount:</span>
                    <span>INR {totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Razorpay 2% Third-Party Charge:</span>
                    <span>INR {razorpayFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
                    <span>Total Charged via Razorpay:</span>
                    <span className="text-gold-700">INR {razorpayTotal.toFixed(2)}</span>
                  </div>

                  <Button
                    type="button"
                    onClick={handleRazorpayClick}
                    disabled={loadingPay}
                    className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5"
                  >
                    <span>{loadingPay ? 'Redirecting to Razorpay...' : 'Pay with Razorpay'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {!isForeign && (
              <div
                onClick={() => setSelectedMethod('manual_upi')}
                className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  selectedMethod === 'manual_upi'
                    ? 'border-gold-600 bg-amber-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 text-orangeAccent-700 flex items-center justify-center">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block text-sm">
                        Manual UPI Transfer
                      </span>
                      <span className="text-xs text-slate-500">
                        Zero extra charges (Google Pay, PhonePe, Paytm, BHIM)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block text-sm">
                      INR {totalAmount.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      0% Extra Gateway Fee
                    </span>
                  </div>
                </div>

                {selectedMethod === 'manual_upi' && (
                  <div className="mt-4 pt-3 space-y-4">
                    <div className="flex flex-col items-center justify-center py-2 space-y-2">
                      {qrCodeUrl ? (
                        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                          <img src={qrCodeUrl} alt="UPI QR Code" className="w-44 h-44" />
                        </div>
                      ) : (
                        <div className="w-44 h-44 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                          Generating QR...
                        </div>
                      )}
                      <span className="text-xs text-slate-500 font-medium">
                        Scan with any UPI App to pay exact amount: <strong>INR {totalAmount.toFixed(2)}</strong>
                      </span>
                    </div>

                    <div className="rounded-md bg-white border border-slate-200 p-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Merchant UPI VPA
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {merchantUpiId}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyUpi}
                        className="flex items-center space-x-1"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy UPI</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleUpiDoneClick}
                      disabled={loadingUpi}
                      className="w-full flex items-center justify-center space-x-2 py-2.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>{loadingUpi ? 'Submitting...' : 'I Have Paid via UPI'}</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
