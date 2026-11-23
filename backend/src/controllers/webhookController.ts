import { verifyWebhookSignature } from '../services/razorpay';
import { orderRepository } from '../repositories/orderRepository';
import { notificationService } from '../services/notificationService';

export async function handleRazorpayWebhook({ request, headers, set }: { request: Request; headers: any; set: any }) {
  const signature = headers['x-razorpay-signature'];
  if (!signature) {
    set.status = 400;
    return { success: false, error: 'Missing signature header' };
  }

  const rawBody = await request.text();

  let isValid = false;
  try {
    isValid = verifyWebhookSignature(rawBody, signature);
  } catch (err: any) {
    set.status = 500;
    return { success: false, error: err.message };
  }

  if (!isValid) {
    set.status = 400;
    return { success: false, error: 'Invalid signature' };
  }

  let eventData: any;
  try {
    eventData = JSON.parse(rawBody);
  } catch {
    set.status = 400;
    return { success: false, error: 'Invalid JSON' };
  }

  if (eventData.event !== 'payment.captured') {
    return { success: true, ignored: true, event: eventData.event };
  }

  const paymentEntity = eventData.payload?.payment?.entity;
  const paymentId: string | undefined = paymentEntity?.id;
  const notesOrderId: string | undefined = paymentEntity?.notes?.orderId;
  const rzpOrderId: string | undefined = paymentEntity?.order_id;
  const targetOrderId = notesOrderId || rzpOrderId;

  if (!targetOrderId || !paymentId) {
    return { success: true, ignored: true, reason: 'Missing order_id or payment_id' };
  }

  const order = await orderRepository.findById(targetOrderId);
  if (!order) {
    return { success: true, ignored: true, reason: 'Order not found in database' };
  }

  const fulfilled = await orderRepository.fulfillRazorpayCaptured(order.id, paymentId);

  notificationService.broadcast({
    event: 'PAYMENT_CAPTURED',
    orderId: order.id,
    identifierId: order.identifierId,
    amount: (paymentEntity.amount || 0) / 100,
    customerName: order.customerName,
    platform: 'razorpay',
    timestamp: new Date().toISOString(),
    data: { paymentId, method: paymentEntity.method },
  });

  return {
    success: true,
    fulfilled: true,
    order: fulfilled,
  };
}
