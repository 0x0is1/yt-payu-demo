import { orderRepository } from '../repositories/orderRepository';
import { calculatePricing } from '../services/taxEngine';
import { createRazorpayPaymentLink, createRazorpayOrder, verifyRazorpayPaymentSignature } from '../services/razorpay';
import { getMerchantSettings } from '../services/settingsService';
import { notificationService } from '../services/notificationService';
import { confirmUpiSchema, confirmBankSchema, markBankPaidSchema } from '../validators/schemas';

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

  const isExpired = order.expiresAt ? new Date(order.expiresAt).getTime() < Date.now() : false;
  if (isExpired) {
    set.status = 400;
    return { success: false, error: 'Order has expired' };
  }

  const pricing = calculatePricing({
    baseAmount: order.baseAmount,
    gstRate: order.gstRate,
    isFreeTrial: order.isFreeTrial,
    customerState: order.state,
    customerCountry: order.country,
    isForeign: order.isForeign,
  });

  const settings = getMerchantSettings();
  const keyId = settings.razorpayKeyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_2xGYyaqTbp0HNw';

  if (order.razorpayOrderId && order.razorpayPaymentLinkUrl) {
    return {
      success: true,
      keyId,
      orderId: order.razorpayOrderId,
      amount: pricing.razorpayTotal,
      paymentLinkUrl: order.razorpayPaymentLinkUrl,
      totalWithFee: pricing.razorpayTotal,
      razorpayFee: pricing.razorpayFee,
    };
  }

  const checkoutBaseUrl = process.env.CHECKOUT_URL || 'http://localhost:3001';
  const callbackUrl = `${checkoutBaseUrl}/pay/${order.identifierId}?status=success`;

  try {
    const [link, razorpayOrder] = await Promise.all([
      createRazorpayPaymentLink({
        amountRupees: pricing.razorpayTotal,
        description: `Payment for Order ${order.id} - ${order.programDuration}`,
        referenceId: `${order.id}_${Date.now()}`,
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
      }),
      createRazorpayOrder({
        amountRupees: pricing.razorpayTotal,
        receipt: order.id,
        notes: {
          orderId: order.id,
          identifierId: order.identifierId,
        },
      }),
    ]);

    await orderRepository.setRazorpayLink(order.id, link.id, link.short_url, pricing.razorpayFee, razorpayOrder.id);
    await orderRepository.recordPaymentAttempt(
      order.id,
      'razorpay',
      'link_generated',
      JSON.stringify({ orderId: razorpayOrder.id, linkId: link.id, linkUrl: link.short_url, amount: pricing.razorpayTotal })
    );

    return {
      success: true,
      keyId,
      orderId: razorpayOrder.id,
      amount: pricing.razorpayTotal,
      paymentLinkUrl: link.short_url,
      totalWithFee: pricing.razorpayTotal,
      razorpayFee: pricing.razorpayFee,
    };
  } catch (err: any) {
    set.status = 500;
    return {
      success: false,
      error: err.message || 'Failed to initialize Razorpay checkout session',
    };
  }
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

  const isExpired = order.expiresAt ? new Date(order.expiresAt).getTime() < Date.now() : false;
  if (isExpired) {
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
    platform: 'upi',
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
    platform: 'upi',
    timestamp: new Date().toISOString(),
    data: { upiTransactionId: parseResult.data.upiTransactionId },
  });

  return {
    success: true,
    order: updated,
  };
}

export async function markBankPaidHandler({ params, body, set }: { params: { identifierId: string }; body: any; set: any }) {
  const parseResult = markBankPaidSchema.safeParse(body || {});
  const bankReferenceId = parseResult.success ? parseResult.data.bankReferenceId : undefined;

  const order = await orderRepository.findByIdentifier(params.identifierId);
  if (!order) {
    set.status = 404;
    return { success: false, error: 'Order not found' };
  }

  if (order.isForeign) {
    set.status = 400;
    return { success: false, error: 'Direct bank transfer is not available for international customers. Please use Razorpay.' };
  }

  if (order.status === 'paid') {
    set.status = 400;
    return { success: false, error: 'Order is already paid' };
  }

  const isExpired = order.expiresAt ? new Date(order.expiresAt).getTime() < Date.now() : false;
  if (isExpired) {
    set.status = 400;
    return { success: false, error: 'Order has expired' };
  }

  const updated = await orderRepository.markBankPaid(params.identifierId, bankReferenceId);

  notificationService.broadcast({
    event: 'BANK_PAID_CLAIMED',
    orderId: order.id,
    identifierId: order.identifierId,
    amount: order.totalAmount,
    customerName: order.customerName,
    platform: 'bank_transfer',
    timestamp: new Date().toISOString(),
    data: { bankReferenceId },
  });

  return {
    success: true,
    order: updated,
  };
}

export async function confirmBankHandler({ params, body, set }: { params: { id: string }; body: any; set: any }) {
  const parseResult = confirmBankSchema.safeParse(body);
  if (!parseResult.success) {
    set.status = 400;
    return { success: false, errors: parseResult.error.flatten() };
  }

  const order = await orderRepository.findById(params.id);
  if (!order) {
    set.status = 404;
    return { success: false, error: 'Order not found' };
  }

  const updated = await orderRepository.confirmBankPayment(params.id, parseResult.data.bankReferenceId);

  notificationService.broadcast({
    event: 'BANK_CONFIRMED',
    orderId: order.id,
    identifierId: order.identifierId,
    amount: order.totalAmount,
    customerName: order.customerName,
    platform: 'bank_transfer',
    timestamp: new Date().toISOString(),
    data: { bankReferenceId: parseResult.data.bankReferenceId },
  });

  return {
    success: true,
    order: updated,
  };
}

export async function activateFreeTrialHandler({ params, set }: { params: { identifierId: string }; set: any }) {
  const order = await orderRepository.findByIdentifier(params.identifierId);
  if (!order) {
    set.status = 404;
    return { success: false, error: 'Order not found' };
  }

  if (!order.isFreeTrial && order.baseAmount > 0) {
    set.status = 400;
    return { success: false, error: 'This payment link is not a free trial request' };
  }

  const updated = await orderRepository.activateFreeTrial(params.identifierId);

  notificationService.broadcast({
    event: 'TRIAL_ACTIVATED',
    orderId: order.id,
    identifierId: order.identifierId,
    amount: 0,
    customerName: order.customerName,
    platform: 'free_trial',
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    order: updated,
  };
}

export async function verifyRazorpayPaymentHandler({ params, body, set }: { params: { identifierId: string }; body: any; set: any }) {
  const order = await orderRepository.findByIdentifier(params.identifierId);
  if (!order) {
    set.status = 404;
    return { success: false, error: 'Order not found' };
  }

  const paymentId = body?.paymentId || body?.razorpay_payment_id || `pay_${Date.now()}`;
  const razorpayOrderId = body?.orderId || body?.razorpay_order_id || order.razorpayOrderId;
  const signature = body?.signature || body?.razorpay_signature;

  if (signature && razorpayOrderId && paymentId) {
    const isValid = verifyRazorpayPaymentSignature(razorpayOrderId, paymentId, signature);
    if (!isValid) {
      set.status = 400;
      return { success: false, error: 'Invalid payment signature' };
    }
  }

  const fulfilled = await orderRepository.fulfillRazorpayCaptured(order.id, paymentId, razorpayOrderId || undefined);

  notificationService.broadcast({
    event: 'PAYMENT_CAPTURED',
    orderId: order.id,
    identifierId: order.identifierId,
    amount: order.totalAmount,
    customerName: order.customerName,
    platform: 'razorpay',
    timestamp: new Date().toISOString(),
    data: { paymentId, razorpayOrderId },
  });

  return { success: true, order: fulfilled };
}
