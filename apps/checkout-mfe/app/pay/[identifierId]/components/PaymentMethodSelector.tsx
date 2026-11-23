'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCheckoutSession } from '@/context/CheckoutContext';
import QRCode from 'qrcode';
import { CreditCard, QrCode, Building, Copy, Check, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentMethodSelector() {
  const {
    order,
    pricing,
    merchantUpiId,
    bankAccountNumber,
    bankIfsc,
    bankAccountName,
    bankName,
    initiateRazorpayPayment,
    verifyRazorpayPayment,
    submitUpiPaid,
    submitBankPaid,
    activateTrial,
  } = useCheckoutSession();

  const isForeign = Boolean(pricing?.isForeign);
  const isTrial = Boolean(pricing?.isFreeTrial || order?.isFreeTrial || order?.baseAmount === 0);

  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'bank_transfer' | 'razorpay'>(
    isForeign ? 'razorpay' : 'upi'
  );
  const [bankRefId, setBankRefId] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedIfsc, setCopiedIfsc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = pricing?.totalAmount || order?.totalAmount || 0;
  const razorpayFee = pricing?.razorpayFee || Math.round(totalAmount * 0.02 * 100) / 100;
  const razorpayTotal = pricing?.razorpayTotal || Math.round((totalAmount + razorpayFee) * 100) / 100;

  useEffect(() => {
    if (isForeign) {
      setSelectedMethod('razorpay');
    } else if (selectedMethod === 'razorpay') {
      setSelectedMethod('upi');
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

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(bankAccountNumber);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } catch {}
  };

  const handleCopyIfsc = async () => {
    try {
      await navigator.clipboard.writeText(bankIfsc);
      setCopiedIfsc(true);
      setTimeout(() => setCopiedIfsc(false), 2000);
    } catch {}
  };

  const handleRazorpayClick = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const session = await initiateRazorpayPayment();
      const isLoaded = await loadRazorpayScript();

      if (isLoaded && typeof window !== 'undefined' && (window as any).Razorpay && session.orderId) {
        const options = {
          key: session.keyId,
          amount: Math.round((session.amount || razorpayTotal) * 100),
          currency: 'INR',
          name: 'PayU Merchant Store',
          description: `${order?.programDuration || 'Subscription'} - Order ${order?.id}`,
          order_id: session.orderId,
          prefill: {
            name: order?.customerName || '',
            email: order?.customerEmail || '',
            contact: order?.customerPhone || '',
          },
          theme: {
            color: '#D97706',
          },
          handler: async function (response: any) {
            setSubmitting(false);
            await verifyRazorpayPayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature
            );
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }

      if (session.paymentLinkUrl) {
        window.location.href = session.paymentLinkUrl;
        return;
      }

      setError('Failed to initialize Razorpay checkout session.');
      setSubmitting(false);
    } catch (err: any) {
      setError(err.message || 'Error launching payment gateway');
      setSubmitting(false);
    }
  };

  const handleUpiDoneClick = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const success = await submitUpiPaid();
      if (!success) {
        setError('Failed to record UPI payment claim. Please try again.');
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error confirming UPI payment');
      setSubmitting(false);
    }
  };

  const handleBankDoneClick = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const success = await submitBankPaid(bankRefId.trim() || undefined);
      if (!success) {
        setError('Failed to record bank transfer claim. Please try again.');
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error confirming bank transfer');
      setSubmitting(false);
    }
  };

  const handleActivateTrial = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const success = await activateTrial();
      if (!success) {
        setError('Failed to activate trial.');
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error activating trial');
      setSubmitting(false);
    }
  };

  if (isTrial) {
    return (
      <Card className="border border-gold-600 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activate Your Free Trial</CardTitle>
            <Badge variant="orange">Zero Cost</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-amber-50 border border-gold-600 p-4 space-y-2">
            <div className="flex items-center space-x-2 text-gold-800 font-semibold text-sm">
              <Sparkles className="h-5 w-5 text-gold-600" />
              <span>Complimentary Access Granted</span>
            </div>
            <p className="text-xs text-slate-600">
              Your free trial requires no payment information or credit card. Click below to activate your account immediately.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleActivateTrial}
            disabled={submitting}
            className="w-full flex items-center justify-center space-x-2 py-3 font-semibold"
          >
            <span>{submitting ? 'Activating...' : 'Activate Free Trial Now'}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-gold-600 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Payment Option</CardTitle>
            <Badge variant={isForeign ? 'orange' : 'gold'}>
              {isForeign ? 'International (Razorpay Only)' : 'UPI & Bank Transfer'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {isForeign ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-orange-50 border border-orangeAccent-600 p-3 text-xs text-orangeAccent-800 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-orangeAccent-700" />
                <span>
                  International customer payment mode: Domestic UPI and Bank Transfer are only available for domestic Indian banking. International members pay securely with international credit/debit cards via Razorpay.
                </span>
              </div>

              <div className="rounded-lg border-2 border-gold-600 bg-amber-50/50 p-4 space-y-3">
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
                        International Cards, Visa, MasterCard, Amex
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block text-sm">
                      INR {razorpayTotal.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-orangeAccent-600 font-semibold">
                      +2% Fee (INR {razorpayFee.toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Base Amount:</span>
                    <span>INR {totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (0% Export of Services):</span>
                    <span className="text-emerald-700 font-medium">INR 0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gateway Processing (2%):</span>
                    <span>INR {razorpayFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                    <span>Total Amount Charged:</span>
                    <span className="text-gold-700">INR {razorpayTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleRazorpayClick}
                  disabled={submitting}
                  className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5"
                >
                  <span>{submitting ? 'Redirecting to Razorpay...' : 'Pay with Razorpay'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                onClick={() => setSelectedMethod('upi')}
                className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  selectedMethod === 'upi'
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
                        UPI Transfer
                      </span>
                      <span className="text-xs text-slate-500">
                        Scan & Pay via Google Pay, PhonePe, Paytm, BHIM
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

                {selectedMethod === 'upi' && (
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
                      disabled={submitting}
                      className="w-full flex items-center justify-center space-x-2 py-2.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>{submitting ? 'Submitting...' : 'Done - I Have Paid via UPI'}</span>
                    </Button>
                  </div>
                )}
              </div>

              <div
                onClick={() => setSelectedMethod('bank_transfer')}
                className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  selectedMethod === 'bank_transfer'
                    ? 'border-gold-600 bg-amber-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block text-sm">
                        Direct Bank Transfer (NEFT / IMPS / RTGS)
                      </span>
                      <span className="text-xs text-slate-500">
                        Transfer directly to the merchant company bank account
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

                {selectedMethod === 'bank_transfer' && (
                  <div className="mt-4 pt-3 space-y-3">
                    <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Beneficiary Name:</span>
                        <span className="font-semibold text-slate-900">{bankAccountName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Bank Name:</span>
                        <span className="font-semibold text-slate-900">{bankName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Account Number:</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-900">{bankAccountNumber}</span>
                          <button
                            type="button"
                            onClick={handleCopyAccount}
                            className="text-gold-600 hover:text-gold-700 p-0.5"
                          >
                            {copiedAccount ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">IFSC Code:</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-900">{bankIfsc}</span>
                          <button
                            type="button"
                            onClick={handleCopyIfsc}
                            className="text-gold-600 hover:text-gold-700 p-0.5"
                          >
                            {copiedIfsc ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="bankRefInput">Bank UTR / Transaction Reference (Optional)</Label>
                      <Input
                        id="bankRefInput"
                        value={bankRefId}
                        onChange={(e) => setBankRefId(e.target.value)}
                        placeholder="e.g. HDFC202611234567"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleBankDoneClick}
                      disabled={submitting}
                      className="w-full flex items-center justify-center space-x-2 py-2.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>{submitting ? 'Submitting...' : 'Done - I Have Transferred via Bank'}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
