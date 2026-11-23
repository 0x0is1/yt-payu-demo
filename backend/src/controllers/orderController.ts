import { orderRepository } from '../repositories/orderRepository';
import { calculatePricing } from '../services/taxEngine';
import { generateOrderSchema } from '../validators/schemas';
import { notificationService } from '../services/notificationService';

export async function getNextOrderIdHandler() {
  const nextOrderId = await orderRepository.getNextOrderId();
  return { success: true, nextOrderId };
}

export async function generateLinkHandler({ body, set, headers }: { body: any; set: any; headers?: any }) {
  const parseResult = generateOrderSchema.safeParse(body);
  if (!parseResult.success) {
    set.status = 400;
    return { success: false, errors: parseResult.error.flatten() };
  }

  const data = parseResult.data;
  const orderId = (data.orderId && data.orderId.trim()) ? data.orderId.trim() : await orderRepository.getNextOrderId();
  const identifierId = `pay_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

  const pricing = calculatePricing({
    baseAmount: data.baseAmount,
    gstRate: data.gstRate,
    customerState: data.state,
    customerCountry: data.country,
    isForeign: data.country?.toLowerCase() !== 'india' && data.country !== undefined,
  });

  const expiresAt = new Date(Date.now() + data.expiryMinutes * 60 * 1000);

  const newOrder = await orderRepository.createOrder({
    id: orderId,
    identifierId,
    baseAmount: pricing.baseAmount,
    gstRate: pricing.gstRate,
    cgst: pricing.cgst,
    sgst: pricing.sgst,
    igst: pricing.igst,
    totalAmount: pricing.totalAmount,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    addressLine: data.addressLine,
    city: data.city,
    state: data.state,
    country: data.country,
    isForeign: pricing.isForeign,
    nationality: data.nationality,
    expiresAt,
  });

  notificationService.broadcast({
    event: 'ORDER_CREATED',
    orderId: newOrder.id,
    identifierId: newOrder.identifierId,
    amount: newOrder.totalAmount,
    customerName: newOrder.customerName,
    timestamp: new Date().toISOString(),
  });

  let checkoutBaseUrl = process.env.CHECKOUT_URL;
  if (!checkoutBaseUrl) {
    const host = headers?.['host'] || '';
    const origin = headers?.['origin'] || '';
    const referer = headers?.['referer'] || '';
    if (
      process.env.VERCEL ||
      process.env.NODE_ENV === 'production' ||
      host.includes('vercel.app') ||
      origin.includes('vercel.app') ||
      referer.includes('vercel.app')
    ) {
      checkoutBaseUrl = 'https://portal-payu-yt.vercel.app';
    } else {
      checkoutBaseUrl = 'http://localhost:3001';
    }
  }
  const paymentLink = `${checkoutBaseUrl}/pay/${identifierId}`;

  return {
    success: true,
    order: newOrder,
    pricing,
    paymentLink,
  };
}

export async function lookupOrderHandler({ params, set }: { params: { identifierId: string }; set: any }) {
  const order = await orderRepository.findByIdentifier(params.identifierId);
  if (!order) {
    set.status = 404;
    return { success: false, error: 'Order not found' };
  }

  const isExpired = new Date(order.expiresAt).getTime() < Date.now();
  if (isExpired && order.status === 'pending') {
    return {
      success: true,
      order: {
        ...order,
        status: 'expired',
      },
      isExpired: true,
    };
  }

  return {
    success: true,
    order,
    isExpired: false,
  };
}

export async function listOrdersHandler() {
  const ordersList = await orderRepository.findAll();
  return {
    success: true,
    orders: ordersList,
  };
}

export async function retryOrderHandler({ params, body, set }: { params: { id: string }; body: any; set: any }) {
  const additionalMinutes = body?.expiryMinutes ? Number(body.expiryMinutes) : 1440;
  const retried = await orderRepository.retryOrder(params.id, additionalMinutes);
  if (!retried) {
    set.status = 404;
    return { success: false, error: 'Order not found' };
  }

  notificationService.broadcast({
    event: 'ORDER_RETRIED',
    orderId: retried.id,
    identifierId: retried.identifierId,
    amount: retried.totalAmount,
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    order: retried,
  };
}
