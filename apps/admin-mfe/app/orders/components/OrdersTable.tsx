'use client';

import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderItem } from '@/context/AdminOrdersContext';
import { RefreshCw, ExternalLink, History, CheckCircle, Search } from 'lucide-react';

interface OrdersTableProps {
  orders: OrderItem[];
  loading: boolean;
  onRetry: (orderId: string) => Promise<boolean>;
  onOpenConfirmUpi: (order: OrderItem) => void;
  onOpenAttempts: (order: OrderItem) => void;
}

export function OrdersTable({
  orders,
  loading,
  onRetry,
  onOpenConfirmUpi,
  onOpenAttempts,
}: OrdersTableProps) {
  const [search, setSearch] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    const term = search.toLowerCase();
    return (
      order.id.toLowerCase().includes(term) ||
      (order.customerName || '').toLowerCase().includes(term) ||
      (order.customerEmail || '').toLowerCase().includes(term) ||
      order.identifierId.toLowerCase().includes(term)
    );
  });

  const handleRetryClick = async (orderId: string) => {
    setRetryingId(orderId);
    await onRetry(orderId);
    setRetryingId(null);
  };

  const getStatusBadge = (order: OrderItem) => {
    const isExpired = new Date(order.expiresAt).getTime() < Date.now() && order.status === 'pending';
    if (order.status === 'paid') {
      return <Badge variant="success">Paid</Badge>;
    }
    if (order.status === 'upi_claimed') {
      return <Badge variant="orange">UPI Claimed</Badge>;
    }
    if (isExpired || order.status === 'expired') {
      return <Badge variant="danger">Expired</Badge>;
    }
    return <Badge variant="gold">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, Name..."
            className="pl-9"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredOrders.length} of {orders.length} requests
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Base & Taxes</TableHead>
              <TableHead>Total (INR)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Loading payment requests...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No payment requests found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const isExpired =
                  new Date(order.expiresAt).getTime() < Date.now() && order.status === 'pending';
                const checkoutBaseUrl =
                  process.env.NEXT_PUBLIC_CHECKOUT_URL || 'http://localhost:3001';
                const payUrl = `${checkoutBaseUrl}/pay/${order.identifierId}`;

                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-mono text-xs font-semibold text-slate-900">{order.id}</div>
                      <span className="text-xs text-slate-400 font-mono">
                        {order.identifierId.slice(0, 14)}...
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {order.customerName || 'Anonymous'}
                      </div>
                      <div className="text-xs text-slate-500">{order.customerEmail || 'No email'}</div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-slate-800">
                        {order.state || 'Pending Geo'}
                      </div>
                      <Badge variant={order.isForeign ? 'orange' : 'slate'} className="mt-0.5 text-[10px]">
                        {order.isForeign ? 'Foreign' : 'Domestic'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-slate-700">
                        Base: INR {order.baseAmount.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {order.igst > 0 ? `IGST: ${order.igst}` : `CGST+SGST: ${order.cgst + order.sgst}`}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-bold text-slate-900">
                        INR {order.totalAmount.toFixed(2)}
                      </span>
                    </TableCell>

                    <TableCell>{getStatusBadge(order)}</TableCell>

                    <TableCell>
                      <button
                        type="button"
                        onClick={() => onOpenAttempts(order)}
                        className="inline-flex items-center space-x-1 text-xs text-gold-600 hover:text-gold-700 font-medium cursor-pointer"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>{order.attempts?.length || 0} attempts</span>
                      </button>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {order.status === 'upi_claimed' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onOpenConfirmUpi(order)}
                            className="flex items-center space-x-1 text-xs"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Confirm UPI</span>
                          </Button>
                        )}

                        {isExpired && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={retryingId === order.id}
                            onClick={() => handleRetryClick(order.id)}
                            className="flex items-center space-x-1 text-xs"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${retryingId === order.id ? 'animate-spin' : ''}`} />
                            <span>Retry (+24h)</span>
                          </Button>
                        )}

                        <a
                          href={payUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-gold-600 rounded transition-colors"
                          title="Open Checkout Link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
