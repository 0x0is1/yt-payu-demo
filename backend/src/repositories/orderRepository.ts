import { db } from '../db/client';
import { orders, paymentAttempts } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface NewOrderRecord {
  id: string;
  identifierId: string;
  baseAmount: number;
  programDuration?: string;
  isFreeTrial?: boolean;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  isForeign?: boolean | null;
  nationality?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  expiresAt?: Date | null;
}

export class OrderRepository {
  public async getNextOrderId(): Promise<string> {
    const allOrders = await db.select({ id: orders.id }).from(orders);
    let maxSeq = 0;
    for (const o of allOrders) {
      const match = o.id.match(/^ORD-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) {
          maxSeq = num;
        }
      }
    }
    const nextNum = maxSeq + 1;
    return `ORD-${String(nextNum).padStart(4, '0')}`;
  }

  public async createOrder(data: NewOrderRecord): Promise<typeof orders.$inferSelect> {
    const now = new Date();

    return await db.transaction(async (tx) => {
      const [newOrder] = await tx
        .insert(orders)
        .values({
          id: data.id,
          identifierId: data.identifierId,
          baseAmount: data.baseAmount,
          programDuration: data.programDuration || '1 Month',
          isFreeTrial: Boolean(data.isFreeTrial),
          gstRate: data.gstRate,
          cgst: data.cgst,
          sgst: data.sgst,
          igst: data.igst,
          totalAmount: data.totalAmount,
          customerName: data.customerName || null,
          customerEmail: data.customerEmail || null,
          customerPhone: data.customerPhone || null,
          addressLine: data.addressLine || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || 'India',
          isForeign: Boolean(data.isForeign),
          nationality: data.nationality || 'Indian',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          status: 'pending',
          expiresAt: data.expiresAt || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return newOrder;
    });
  }

  public async findById(id: string): Promise<typeof orders.$inferSelect | undefined> {
    const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return rows[0];
  }

  public async findByIdentifier(identifierId: string): Promise<typeof orders.$inferSelect | undefined> {
    const rows = await db.select().from(orders).where(eq(orders.identifierId, identifierId)).limit(1);
    return rows[0];
  }

  public async findAll(): Promise<Array<typeof orders.$inferSelect & { attempts: (typeof paymentAttempts.$inferSelect)[] }>> {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const allAttempts = await db.select().from(paymentAttempts).orderBy(desc(paymentAttempts.createdAt));

    const attemptsByOrderId = new Map<string, (typeof paymentAttempts.$inferSelect)[]>();
    for (const attempt of allAttempts) {
      const list = attemptsByOrderId.get(attempt.orderId) || [];
      list.push(attempt);
      attemptsByOrderId.set(attempt.orderId, list);
    }

    return allOrders.map((order) => ({
      ...order,
      attempts: attemptsByOrderId.get(order.id) || [],
    }));
  }

  public async updatePricingAndLocation(
    identifierId: string,
    data: {
      cgst: number;
      sgst: number;
      igst: number;
      totalAmount: number;
      razorpayFee: number;
      state?: string;
      country?: string;
      isForeign?: boolean;
    }
  ): Promise<typeof orders.$inferSelect | undefined> {
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(orders).where(eq(orders.identifierId, identifierId)).limit(1);
      if (!existing[0]) return undefined;

      const now = new Date();
      const [updated] = await tx
        .update(orders)
        .set({
          cgst: data.cgst,
          sgst: data.sgst,
          igst: data.igst,
          totalAmount: data.totalAmount,
          razorpayFee: data.razorpayFee,
          ...(data.state !== undefined ? { state: data.state } : {}),
          ...(data.country !== undefined ? { country: data.country } : {}),
          ...(data.isForeign !== undefined ? { isForeign: data.isForeign } : {}),
          updatedAt: now,
        })
        .where(eq(orders.identifierId, identifierId))
        .returning();

      return updated;
    });
  }

  public async updateCustomerDetails(
    identifierId: string,
    data: {
      customerName: string;
      customerEmail?: string | null;
      customerPhone?: string | null;
      addressLine?: string | null;
      city?: string | null;
      state: string;
      country: string;
      isForeign: boolean;
      nationality?: string;
      latitude?: number | null;
      longitude?: number | null;
      cgst: number;
      sgst: number;
      igst: number;
      totalAmount: number;
      razorpayFee: number;
    }
  ): Promise<typeof orders.$inferSelect | undefined> {
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(orders).where(eq(orders.identifierId, identifierId)).limit(1);
      if (!existing[0]) return undefined;

      const now = new Date();
      const [updated] = await tx
        .update(orders)
        .set({
          customerName: data.customerName,
          customerEmail: data.customerEmail || null,
          customerPhone: data.customerPhone || null,
          addressLine: data.addressLine || null,
          city: data.city || null,
          state: data.state,
          country: data.country,
          isForeign: data.isForeign,
          nationality: data.nationality || 'Indian',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          cgst: data.cgst,
          sgst: data.sgst,
          igst: data.igst,
          totalAmount: data.totalAmount,
          razorpayFee: data.razorpayFee,
          updatedAt: now,
        })
        .where(eq(orders.identifierId, identifierId))
        .returning();

      return updated;
    });
  }

  public async recordPaymentAttempt(orderId: string, platform: string, status: string, referenceData?: string): Promise<void> {
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.transaction(async (tx) => {
      await tx.insert(paymentAttempts).values({
        id: attemptId,
        orderId,
        platform,
        status,
        referenceData: referenceData || null,
        createdAt: new Date(),
      });
    });
  }

  public async setRazorpayLink(
    orderId: string,
    linkId: string,
    linkUrl: string,
    razorpayFee: number,
    razorpayOrderId?: string
  ): Promise<void> {
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          razorpayPaymentLinkId: linkId,
          razorpayPaymentLinkUrl: linkUrl,
          ...(razorpayOrderId ? { razorpayOrderId } : {}),
          razorpayFee,
          paymentMethod: 'razorpay',
          updatedAt: now,
        })
        .where(eq(orders.id, orderId));
    });
  }

  public async markUpiPaid(identifierId: string): Promise<typeof orders.$inferSelect | undefined> {
    const now = new Date();
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(orders).where(eq(orders.identifierId, identifierId)).limit(1);
      if (!existing[0]) return undefined;

      const [updated] = await tx
        .update(orders)
        .set({
          paymentMethod: 'upi',
          status: 'upi_claimed',
          upiMarkedPaidAt: now,
          updatedAt: now,
        })
        .where(eq(orders.identifierId, identifierId))
        .returning();

      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.insert(paymentAttempts).values({
        id: attemptId,
        orderId: existing[0].id,
        platform: 'upi',
        status: 'claimed_by_customer',
        referenceData: JSON.stringify({ claimedAt: now.toISOString() }),
        createdAt: now,
      });

      return updated;
    });
  }

  public async confirmUpiPayment(orderId: string, upiTransactionId: string): Promise<typeof orders.$inferSelect | undefined> {
    const now = new Date();
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!existing[0]) return undefined;

      const [updated] = await tx
        .update(orders)
        .set({
          status: 'paid',
          paymentMethod: 'upi',
          upiTransactionId,
          upiConfirmedAt: now,
          updatedAt: now,
        })
        .where(eq(orders.id, orderId))
        .returning();

      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.insert(paymentAttempts).values({
        id: attemptId,
        orderId,
        platform: 'upi',
        status: 'confirmed_by_admin',
        referenceData: JSON.stringify({ upiTransactionId, confirmedAt: now.toISOString() }),
        createdAt: now,
      });

      return updated;
    });
  }

  public async markBankPaid(identifierId: string, bankReferenceId?: string): Promise<typeof orders.$inferSelect | undefined> {
    const now = new Date();
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(orders).where(eq(orders.identifierId, identifierId)).limit(1);
      if (!existing[0]) return undefined;

      const [updated] = await tx
        .update(orders)
        .set({
          paymentMethod: 'bank_transfer',
          status: 'bank_claimed',
          bankReferenceId: bankReferenceId || null,
          bankMarkedPaidAt: now,
          updatedAt: now,
        })
        .where(eq(orders.identifierId, identifierId))
        .returning();

      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.insert(paymentAttempts).values({
        id: attemptId,
        orderId: existing[0].id,
        platform: 'bank_transfer',
        status: 'claimed_by_customer',
        referenceData: JSON.stringify({ bankReferenceId: bankReferenceId || null, claimedAt: now.toISOString() }),
        createdAt: now,
      });

      return updated;
    });
  }

  public async confirmBankPayment(orderId: string, bankReferenceId: string): Promise<typeof orders.$inferSelect | undefined> {
    const now = new Date();
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!existing[0]) return undefined;

      const [updated] = await tx
        .update(orders)
        .set({
          status: 'paid',
          paymentMethod: 'bank_transfer',
          bankReferenceId,
          bankConfirmedAt: now,
          updatedAt: now,
        })
        .where(eq(orders.id, orderId))
        .returning();

      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.insert(paymentAttempts).values({
        id: attemptId,
        orderId,
        platform: 'bank_transfer',
        status: 'confirmed_by_admin',
        referenceData: JSON.stringify({ bankReferenceId, confirmedAt: now.toISOString() }),
        createdAt: now,
      });

      return updated;
    });
  }

  public async activateFreeTrial(identifierId: string): Promise<typeof orders.$inferSelect | undefined> {
    const now = new Date();
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(orders).where(eq(orders.identifierId, identifierId)).limit(1);
      if (!existing[0]) return undefined;

      const [updated] = await tx
        .update(orders)
        .set({
          status: 'paid',
          paymentMethod: 'free_trial',
          updatedAt: now,
        })
        .where(eq(orders.identifierId, identifierId))
        .returning();

      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.insert(paymentAttempts).values({
        id: attemptId,
        orderId: existing[0].id,
        platform: 'free_trial',
        status: 'activated',
        referenceData: JSON.stringify({ activatedAt: now.toISOString() }),
        createdAt: now,
      });

      return updated;
    });
  }

  public async fulfillRazorpayCaptured(
    orderId: string,
    paymentId: string,
    razorpayOrderId?: string
  ): Promise<typeof orders.$inferSelect | undefined> {
    const now = new Date();
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!existing[0]) return undefined;
      if (existing[0].status === 'paid') return existing[0];

      const [updated] = await tx
        .update(orders)
        .set({
          status: 'paid',
          razorpayPaymentId: paymentId,
          paymentMethod: 'razorpay',
          ...(razorpayOrderId ? { razorpayOrderId } : {}),
          updatedAt: now,
        })
        .where(eq(orders.id, orderId))
        .returning();

      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.insert(paymentAttempts).values({
        id: attemptId,
        orderId,
        platform: 'razorpay',
        status: 'captured',
        referenceData: JSON.stringify({ paymentId, razorpayOrderId, capturedAt: now.toISOString() }),
        createdAt: now,
      });

      return updated;
    });
  }

  public async retryOrder(orderId: string, additionalMinutes: number = 1440): Promise<typeof orders.$inferSelect | undefined> {
    const now = new Date();
    const newExpiresAt = additionalMinutes > 0 ? new Date(now.getTime() + additionalMinutes * 60 * 1000) : null;

    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!existing[0]) return undefined;

      const [updated] = await tx
        .update(orders)
        .set({
          status: 'pending',
          expiresAt: newExpiresAt,
          updatedAt: now,
        })
        .where(eq(orders.id, orderId))
        .returning();

      return updated;
    });
  }
}

export const orderRepository = new OrderRepository();
