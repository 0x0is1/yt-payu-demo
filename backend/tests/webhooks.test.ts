import { describe, it, expect, beforeAll } from 'bun:test';
import { app } from '../src/index';
import { initializeDatabase } from '../src/db/migrate';
import { orderRepository } from '../src/repositories/orderRepository';
import { createHmac } from 'crypto';

describe('Razorpay Webhook Handler', () => {
  beforeAll(() => {
    initializeDatabase();
  });

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_whsec_987654321';

  function signPayload(payloadString: string): string {
    return createHmac('sha256', webhookSecret).update(payloadString).digest('hex');
  }

  it('rejects webhooks with missing signature header', async () => {
    const res = await app.handle(
      new Request('http://localhost:4000/api/webhooks/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'payment.captured' }),
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing signature');
  });

  it('rejects webhooks with forged signature', async () => {
    const bodyStr = JSON.stringify({ event: 'payment.captured' });
    const res = await app.handle(
      new Request('http://localhost:4000/api/webhooks/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': 'forged_signature_12345',
        },
        body: bodyStr,
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid signature');
  });

  it('atomically fulfills an order upon valid payment.captured webhook', async () => {
    const orderId = `webhook_ord_${Date.now()}`;
    const identifierId = `webhook_pay_${Date.now()}`;

    await orderRepository.createOrder({
      id: orderId,
      identifierId,
      baseAmount: 2000,
      gstRate: 18,
      cgst: 180,
      sgst: 180,
      igst: 0,
      totalAmount: 2360,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const paymentId = `pay_wh_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            amount: 236000,
            currency: 'INR',
            status: 'captured',
            method: 'card',
            order_id: null,
            notes: {
              orderId,
              identifierId,
            },
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = signPayload(rawBody);

    const res = await app.handle(
      new Request('http://localhost:4000/api/webhooks/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signature,
        },
        body: rawBody,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.fulfilled).toBe(true);

    const updated = await orderRepository.findById(orderId);
    expect(updated?.status).toBe('paid');
    expect(updated?.razorpayPaymentId).toBe(paymentId);
    expect(updated?.paymentMethod).toBe('razorpay');
  });

  it('safely ignores non-captured events without failing', async () => {
    const payload = { event: 'refund.created', payload: {} };
    const rawBody = JSON.stringify(payload);
    const signature = signPayload(rawBody);

    const res = await app.handle(
      new Request('http://localhost:4000/api/webhooks/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signature,
        },
        body: rawBody,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.ignored).toBe(true);
  });
});
