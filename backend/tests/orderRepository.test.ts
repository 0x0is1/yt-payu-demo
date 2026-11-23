import { describe, it, expect, beforeAll } from 'bun:test';
import { orderRepository } from '../src/repositories/orderRepository';
import { initializeDatabase } from '../src/db/migrate';
import { db } from '../src/db/client';
import { orders } from '../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Order Repository with ACID Transactions', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  it('creates an order atomically within an ACID transaction', async () => {
    const orderId = `test_ord_${Date.now()}`;
    const identifierId = `test_pay_${Date.now()}`;

    const created = await orderRepository.createOrder({
      id: orderId,
      identifierId,
      baseAmount: 1000,
      programDuration: '1 Month',
      gstRate: 18,
      cgst: 90,
      sgst: 90,
      igst: 0,
      totalAmount: 1180,
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      state: 'Karnataka',
      country: 'India',
      expiresAt: new Date(Date.now() + 86400000),
    });

    expect(created.id).toBe(orderId);
    expect(created.status).toBe('pending');

    const fetched = await orderRepository.findById(orderId);
    expect(fetched).toBeDefined();
    expect(fetched?.identifierId).toBe(identifierId);
    expect(fetched?.totalAmount).toBe(1180);
  });

  it('atomically rolls back a transaction on error', async () => {
    const doomedId = `doomed_${Date.now()}`;
    let rolledBack = false;

    try {
      await db.transaction(async (tx) => {
        await tx.insert(orders).values({
          id: doomedId,
          identifierId: doomedId,
          baseAmount: 500,
          totalAmount: 590,
          status: 'pending',
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        throw new Error('Simulated atomic transaction abort');
      });
    } catch {
      rolledBack = true;
    }

    expect(rolledBack).toBe(true);
    const lookup = await db.select().from(orders).where(eq(orders.id, doomedId));
    expect(lookup.length).toBe(0);
  });

  it('atomically updates customer details and recalculated taxes', async () => {
    const id = `test_update_${Date.now()}`;
    const identifier = `test_pay_update_${Date.now()}`;

    await orderRepository.createOrder({
      id,
      identifierId: identifier,
      baseAmount: 1000,
      gstRate: 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalAmount: 1000,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const updated = await orderRepository.updateCustomerDetails(identifier, {
      customerName: 'Updated Name',
      customerEmail: 'updated@example.com',
      addressLine: '123 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      isForeign: false,
      cgst: 90,
      sgst: 90,
      igst: 0,
      totalAmount: 1180,
      razorpayFee: 23.6,
    });

    expect(updated).toBeDefined();
    expect(updated?.customerName).toBe('Updated Name');
    expect(updated?.totalAmount).toBe(1180);
    expect(updated?.razorpayFee).toBe(23.6);
  });

  it('atomically marks payment as UPI claimed and records payment attempt', async () => {
    const id = `test_upi_${Date.now()}`;
    const identifier = `test_pay_upi_${Date.now()}`;

    await orderRepository.createOrder({
      id,
      identifierId: identifier,
      baseAmount: 1000,
      gstRate: 18,
      cgst: 90,
      sgst: 90,
      igst: 0,
      totalAmount: 1180,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const claimed = await orderRepository.markUpiPaid(identifier);
    expect(claimed?.status).toBe('upi_claimed');
    expect(claimed?.paymentMethod).toBe('upi');
    expect(claimed?.upiMarkedPaidAt).toBeDefined();

    const confirmed = await orderRepository.confirmUpiPayment(id, 'UPI_TXN_998877');
    expect(confirmed?.status).toBe('paid');
    expect(confirmed?.upiTransactionId).toBe('UPI_TXN_998877');
    expect(confirmed?.upiConfirmedAt).toBeDefined();
  });

  it('atomically marks payment as bank claimed and records payment attempt', async () => {
    const id = `test_bank_${Date.now()}`;
    const identifier = `test_pay_bank_${Date.now()}`;

    await orderRepository.createOrder({
      id,
      identifierId: identifier,
      baseAmount: 2500,
      gstRate: 18,
      cgst: 225,
      sgst: 225,
      igst: 0,
      totalAmount: 2950,
      expiresAt: null,
    });

    const claimed = await orderRepository.markBankPaid(identifier, 'REF_BANK_554433');
    expect(claimed?.status).toBe('bank_claimed');
    expect(claimed?.paymentMethod).toBe('bank_transfer');
    expect(claimed?.bankMarkedPaidAt).toBeDefined();

    const confirmed = await orderRepository.confirmBankPayment(id, 'REF_BANK_554433');
    expect(confirmed?.status).toBe('paid');
    expect(confirmed?.bankReferenceId).toBe('REF_BANK_554433');
    expect(confirmed?.bankConfirmedAt).toBeDefined();
  });

  it('atomically extends expiry date on retry', async () => {
    const id = `test_retry_${Date.now()}`;
    const identifier = `test_pay_retry_${Date.now()}`;

    await orderRepository.createOrder({
      id,
      identifierId: identifier,
      baseAmount: 1000,
      gstRate: 18,
      cgst: 90,
      sgst: 90,
      igst: 0,
      totalAmount: 1180,
      expiresAt: new Date(Date.now() - 1000),
    });

    const retried = await orderRepository.retryOrder(id, 1440);
    expect(retried?.status).toBe('pending');
    expect(new Date(retried!.expiresAt!).getTime()).toBeGreaterThan(Date.now());
  });
});
