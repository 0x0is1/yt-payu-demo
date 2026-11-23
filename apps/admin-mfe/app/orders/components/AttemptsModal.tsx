'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { OrderItem } from '@/context/AdminOrdersContext';

interface AttemptsModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AttemptsModal({ order, isOpen, onClose }: AttemptsModalProps) {
  if (!order) return null;

  const attempts = order.attempts || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Payment Attempts — ${order.id}`}>
      <div className="space-y-3">
        {attempts.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No payment attempts logged yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {attempts.map((attempt) => (
              <div key={attempt.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold uppercase tracking-wider text-slate-800 block">
                    {attempt.platform}
                  </span>
                  <span className="text-slate-500">
                    {new Date(attempt.createdAt).toLocaleString()}
                  </span>
                </div>
                <Badge
                  variant={
                    attempt.status === 'captured' || attempt.status === 'confirmed_by_admin'
                      ? 'success'
                      : attempt.status === 'claimed_by_customer'
                      ? 'orange'
                      : 'slate'
                  }
                >
                  {attempt.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
