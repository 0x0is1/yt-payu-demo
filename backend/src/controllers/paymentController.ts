import { orderRepository } from '../repositories/orderRepository';
import { calculatePricing } from '../services/taxEngine';
import { createRazorpayPaymentLink } from '../services/razorpay';
import { notificationService } from '../services/notificationService';
import { confirmUpiSchema } from '../validators/schemas';

export async function createRazorpayLinkHandler({ params, set }: { params: { identifierId: string }; set: any }) {
  const order = await orderRepository.findByIdentifier(params.identifierId);
  if (!order) {
    set.status = 404;
    return { success: false, error: 'Order not found' };
  }

  if (order.status === 'paid') {
    set.status = 400;
    return { success: false, error: 'Order is already paid' };
  }

  if (new Date(order.expiresAt).getTime() < Date.now()) {
    set.status = 400;
    return { success: false, error: 'Order has expired' };
  }

  const pricing = calculatePricing({
    baseAmount: order.baseAmount,
    gstRate: order.gstRate,
    customerState: order.state,
    customerCountry: order.country,
    isForeign: order.isForeign,
  });

  const checkoutBaseUrl = process.env.CHECKOUT_URL || 'http://localhost:3001';
  const callbackUrl = `${checkoutBaseUrl}/pay/${order.identifierId}?status=success`;

  const link = await createRazorpayPaymentLink({
    amountRupees: pricing.razorpayTotal,
    description: `Payment for Order ${order.id}`,
    referenceId: order.id,
    callbackUrl,
    customer: {
      name: order.customerName || 'Customer',
      email: order.customerEmail || undefined,
      contact: order.customerPhone || undefined,
    },
    notes: {
      orderId: order.id,
      identifierId: order.identifierId,
    },
  });

  await orderRepository.setRazorpayLink(order.id, link.id, link.short_url, pricing.razorpayFee);
  await orderRepository.recordPaymentAttempt(
    order.id,
    'razorpay',
    'link_generated',
    JSON.stringify({ linkId: link.id, linkUrl: link.short_url, amount: pricing.razorpayTotal })
  );

  return {
    success: true,
    paymentLinkUrl: link.short_url,
    totalWithFee: pricing.razorpayTotal,
    razorpayFee: pricing.razorpayFee,
  };
}

export async function markUpiPaidHandler({ params, set }: { params: { identifierId: string }; set: any }) {
  const order = await orderRepository.findByIdentifier(params.identifierId);
  if (!order) {
    set.status = 404;
    return { success: false, error: 'Order not found' };
  }

  if (order.isForeign) {
    set.status = 400;
    return { success: false, error: 'Manual UPI is not available for international customers. Please use Razorpay.' };
  }

  if (order.status === 'paid') {
    set.status = 400;
    return { success: false, error: 'Order is already paid' };
  }

  if (new Date(order.expiresAt).getTime() < Date.now()) {
    set.status = 400;
    return { success: false, error: 'Order has expired' };
  }

  const updated = await orderRepository.markUpiPaid(params.identifierId);

  notificationService.broadcast({
    event: 'UPI_PAID_CLAIMED',
    orderId: order.id,
    identifierId: order.identifierId,
    amount: order.totalAmount,
    customerName: order.customerName,
    platform: 'manual_upi',
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    order: updated,
  };
}

export async function confirmUpiHandler({ params, body, set }: { params: { id: string }; body: any; set: any }) {
  const parseResult = confirmUpiSchema.safeParse(body);
  if (!parseResult.success) {
    set.status = 400;
    return { success: false, errors: parseResult.error.flatten() };
  }

  const order = await orderRepository.findById(params.id);
  if (!order) {
    set.status = 404;
    return { success: false, error: 'Order not found' };
  }

  const updated = await orderRepository.confirmUpiPayment(params.id, parseResult.data.upiTransactionId);

  notificationService.broadcast({
    event: 'UPI_CONFIRMED',
    orderId: order.id,
    identifierId: order.identifierId,
    amount: order.totalAmount,
    customerName: order.customerName,
    platform: 'manual_upi',
    timestamp: new Date().toISOString(),
    data: { upiTransactionId: parseResult.data.upiTransactionId },
  });

  return {
    success: true,
    order: updated,
  };
}
