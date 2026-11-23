import { describe, it, expect, beforeAll } from 'bun:test';
import { app } from '../src/index';
import { initializeDatabase } from '../src/db/migrate';

describe('Order & Checkout REST APIs', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  let generatedIdentifierId: string;
  let generatedOrderId: string;

  it('generates an order and payment link via POST /api/orders/generate-link', async () => {
    const res = await app.handle(
      new Request('http://localhost:4000/api/orders/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseAmount: 1000,
          programDuration: '3 Months',
          expiryMinutes: 1440,
          state: 'Karnataka',
          country: 'India',
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.order).toBeDefined();
    expect(data.order.totalAmount).toBe(1180);
    expect(data.paymentLink).toContain('/pay/');

    generatedOrderId = data.order.id;
    generatedIdentifierId = data.order.identifierId;
  });

  it('looks up an order by identifierId via GET /api/orders/:identifierId', async () => {
    const res = await app.handle(
      new Request(`http://localhost:4000/api/orders/${generatedIdentifierId}`)
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.order.id).toBe(generatedOrderId);
  });

  it('dynamically calculates pricing for intra-state via POST /api/orders/:identifierId/calculate-pricing', async () => {
    const res = await app.handle(
      new Request(`http://localhost:4000/api/orders/${generatedIdentifierId}/calculate-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: 'Karnataka',
          country: 'India',
          isForeign: false,
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.pricing.taxType).toBe('intra_state');
    expect(data.pricing.cgst).toBe(90);
    expect(data.pricing.sgst).toBe(90);
    expect(data.pricing.availableMethods).toEqual(['upi', 'bank_transfer']);
  });

  it('dynamically calculates 0% GST and limits to Razorpay only for foreign customer', async () => {
    const res = await app.handle(
      new Request(`http://localhost:4000/api/orders/${generatedIdentifierId}/calculate-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: 'California',
          country: 'United States',
          isForeign: true,
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.pricing.isForeign).toBe(true);
    expect(data.pricing.cgst).toBe(0);
    expect(data.pricing.sgst).toBe(0);
    expect(data.pricing.igst).toBe(0);
    expect(data.pricing.totalAmount).toBe(1000);
    expect(data.pricing.availableMethods).toEqual(['razorpay']);
  });

  it('resolves location coordinates via POST /api/location/resolve-state', async () => {
    const res = await app.handle(
      new Request('http://localhost:4000/api/location/resolve-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: 12.9716,
          longitude: 77.5946,
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.location.state).toBe('Karnataka');
    expect(data.location.isForeign).toBe(false);
  });

  it('generates a Razorpay link via POST /api/orders/:identifierId/razorpay-link', async () => {
    const res = await app.handle(
      new Request(`http://localhost:4000/api/orders/${generatedIdentifierId}/razorpay-link`, {
        method: 'POST',
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.paymentLinkUrl).toBeDefined();
    expect(data.razorpayFee).toBeGreaterThan(0);
  });

  it('marks order as UPI claimed via POST /api/orders/:identifierId/mark-upi-paid', async () => {
    await app.handle(
      new Request(`http://localhost:4000/api/orders/${generatedIdentifierId}/calculate-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: 'Karnataka',
          country: 'India',
          isForeign: false,
        }),
      })
    );

    const res = await app.handle(
      new Request(`http://localhost:4000/api/orders/${generatedIdentifierId}/mark-upi-paid`, {
        method: 'POST',
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.order.status).toBe('upi_claimed');
  });

  it('admin confirms UPI payment via PATCH /api/admin/orders/:id/confirm-upi', async () => {
    const res = await app.handle(
      new Request(`http://localhost:4000/api/admin/orders/${generatedOrderId}/confirm-upi`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upiTransactionId: 'UPI_REF_1234567890',
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.order.status).toBe('paid');
    expect(data.order.upiTransactionId).toBe('UPI_REF_1234567890');
  });

  it('records and confirms bank transfer payment', async () => {
    const createRes = await app.handle(
      new Request('http://localhost:4000/api/orders/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseAmount: 3000,
          programDuration: '6 Months',
          expiryMinutes: 0,
        }),
      })
    );
    const createData = await createRes.json();
    const orderId = createData.order.id;
    const identifierId = createData.order.identifierId;

    const claimRes = await app.handle(
      new Request(`http://localhost:4000/api/orders/${identifierId}/mark-bank-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankReferenceId: 'HDFC_NEFT_987654' }),
      })
    );
    expect(claimRes.status).toBe(200);
    const claimData = await claimRes.json();
    expect(claimData.order.status).toBe('bank_claimed');

    const confirmRes = await app.handle(
      new Request(`http://localhost:4000/api/admin/orders/${orderId}/confirm-bank`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankReferenceId: 'HDFC_NEFT_987654' }),
      })
    );
    expect(confirmRes.status).toBe(200);
    const confirmData = await confirmRes.json();
    expect(confirmData.order.status).toBe('paid');
    expect(confirmData.order.bankReferenceId).toBe('HDFC_NEFT_987654');
  });

  it('lists all orders with attempts via GET /api/admin/orders', async () => {
    const res = await app.handle(new Request('http://localhost:4000/api/admin/orders'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.orders)).toBe(true);
    expect(data.orders.length).toBeGreaterThan(0);
  });

  it('retries an order via POST /api/admin/orders/:id/retry', async () => {
    const res = await app.handle(
      new Request(`http://localhost:4000/api/admin/orders/${generatedOrderId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiryMinutes: 2880 }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.order.status).toBe('pending');
  });
});
