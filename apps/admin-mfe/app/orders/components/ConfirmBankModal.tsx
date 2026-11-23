'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OrderItem } from '@/context/AdminOrdersContext';
import { CheckCircle2 } from 'lucide-react';

interface ConfirmBankModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string, bankReferenceId: string) => Promise<boolean>;
}

export function ConfirmBankModal({ order, isOpen, onClose, onConfirm }: ConfirmBankModalProps) {
  const [bankRef, setBankRef] = useState(order?.bankReferenceId || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankRef.trim() || bankRef.trim().length < 4) {
      setError('Please enter a valid Bank UTR / NEFT reference ID (min 4 characters)');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const success = await onConfirm(order.id, bankRef.trim());
      if (success) {
        setBankRef('');
        onClose();
      } else {
        setError('Failed to confirm bank transfer on server');
      }
    } catch (err: any) {
      setError(err.message || 'Error confirming payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Bank Transfer Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-amber-50 border border-gold-600 p-3 space-y-1">
          <div className="flex justify-between text-xs text-slate-700">
            <span>Order ID:</span>
            <span className="font-mono font-semibold">{order.id}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-700">
            <span>Program:</span>
            <span className="font-semibold text-gold-700">{order.programDuration || 'Standard'}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-700">
            <span>Customer:</span>
            <span className="font-medium">{order.customerName || 'Anonymous'}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-700">
            <span>Total Payable:</span>
            <span className="font-bold text-gold-700">INR {order.totalAmount.toFixed(2)}</span>
          </div>
          {order.bankReferenceId && (
            <div className="flex justify-between text-xs text-slate-700">
              <span>Customer Claimed UTR:</span>
              <span className="font-mono font-bold text-slate-900">{order.bankReferenceId}</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="bankRef">Bank UTR / Transaction Reference ID *</Label>
          <Input
            id="bankRef"
            value={bankRef}
            onChange={(e) => setBankRef(e.target.value)}
            placeholder="e.g. HDFC202611234567 or NEFT-XYZ"
            required
            autoFocus
          />
          <p className="text-xs text-slate-500">
            Verify receipt in your merchant bank account statement before confirming.
          </p>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting} className="flex items-center space-x-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>{submitting ? 'Confirming...' : 'Confirm Bank Transfer'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
