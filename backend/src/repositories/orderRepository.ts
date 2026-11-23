import { db } from '../db/client';
import { orders, paymentAttempts } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface NewOrderRecord {
  id: string;
  identifierId: string;
  baseAmount: number;
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
  expiresAt: Date;
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

    return db.transaction((tx) => {
      const [newOrder] = tx
        .insert(orders)
        .values({
          id: data.id,
          identifierId: data.identifierId,
          baseAmount: data.baseAmount,
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
          expiresAt: data.expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .all();

      return newOrder;
    });
  }

  public async findById(id: string): Promise<typeof orders.$inferSelect | undefined> {
    const rows = db.select().from(orders).where(eq(orders.id, id)).limit(1).all();
    return rows[0];
  }

  public async findByIdentifier(identifierId: string): Promise<typeof orders.$inferSelect | undefined> {
    const rows = db.select().from(orders).where(eq(orders.identifierId, identifierId)).limit(1).all();
    return rows[0];
  }

  public async findAll(): Promise<Array<typeof orders.$inferSelect & { attempts: (typeof paymentAttempts.$inferSelect)[] }>> {
    const allOrders = db.select().from(orders).orderBy(desc(orders.createdAt)).all();
    const allAttempts = db.select().from(paymentAttempts).orderBy(desc(paymentAttempts.createdAt)).all();

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
    return db.transaction((tx) => {
      const existing = tx.select().from(orders).where(eq(orders.identifierId, identifierId)).limit(1).all();
      if (!existing[0]) return undefined;

      const now = new Date();
      const [updated] = tx
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
        .returning()
        .all();

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
      latitude?: number;
      longitude?: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalAmount: number;
      razorpayFee: number;
    }
  ): Promise<typeof orders.$inferSelect | undefined> {
    return db.transaction((tx) => {
      const existing = tx.select().from(orders).where(eq(orders.identifierId, identifierId)).limit(1).all();
      if (!existing[0]) return undefined;

      const now = new Date();
      const [updated] = tx
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
        .returning()
        .all();

      return updated;
    });
  }

  public async recordPaymentAttempt(orderId: string, platform: string, status: string, referenceData?: string): Promise<void> {
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.transaction((tx) => {
      tx.insert(paymentAttempts)
        .values({
          id: attemptId,
          orderId,
          platform,
          status,
          referenceData: referenceData || null,
          createdAt: new Date(),
        })
        .run();
    });
  }

  public async setRazorpayLink(orderId: string, linkId: string, linkUrl: string, razorpayFee: number): Promise<void> {
    const now = new Date();
    db.transaction((tx) => {
      tx.update(orders)
        .set({
          razorpayPaymentLinkId: linkId,
          razorpayPaymentLinkUrl: linkUrl,
          razorpayFee,
          paymentMethod: 'razorpay',
          updatedAt: now,
        })
        .where(eq(orders.id, orderId))
        .run();
    });
  }

  public async markUpiPaid(identifierId: string): Promise<typeof orders.$inferSelect | undefined> {
    const now = new Date();
    return db.transaction((tx) => {
      const existing = tx.select().from(orders).where(eq(orders.identifierId, identifierId)).limit(1).all();
      if (!existing[0]) return undefined;

      const [updated] = tx
        .update(orders)
        .set({
          paymentMethod: 'manual_upi',
          status: 'upi_claimed',
          upiMarkedPaidAt: now,
          updatedAt: now,
        })
        .where(eq(orders.identifierId, identifierId))
        .returning()
        .all();

      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      tx.insert(paymentAttempts)
        .values({
          id: attemptId,
          orderId: existing[0].id,
          platform: 'manual_upi',
          status: 'claimed_by_customer',
          referenceData: JSON.stringify({ claimedAt: now.toISOString() }),
          createdAt: now,
        })
        .run();

      return updated;
    });
  }

  public async confirmUpiPayment(orderId: string, upiTransactionId: string): Promise<typeof orders.$inferSelect | undefined> {
    const now = new Date();
    return db.transaction((tx) => {
      const existing = tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).all();
      if (!existing[0]) return undefined;

      const [updated] = tx
        .update(orders)
        .set({
          status: 'paid',
          upiTransactionId,
          upiConfirmedAt: now,
          updatedAt: now,
        })
        .where(eq(orders.id, orderId))
        .returning()
        .all();

      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      tx.insert(paymentAttempts)
        .values({
          id: attemptId,
          orderId,
          platform: 'manual_upi',
          status: 'confirmed_by_admin',
          referenceData: JSON.stringify({ upiTransactionId, confirmedAt: now.toISOString() }),
          createdAt: now,
        })
        .run();

      return updated;
    });
  }

  public async fulfillRazorpayCaptured(orderId: string, paymentId: string): Promise<typeof orders.$inferSelect | undefined> {
    const now = new Date();
    return db.transaction((tx) => {
      const existing = tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).all();
      if (!existing[0]) return undefined;
      if (existing[0].status === 'paid') return existing[0];

      const [updated] = tx
        .update(orders)
        .set({
          status: 'paid',
          razorpayPaymentId: paymentId,
          paymentMethod: 'razorpay',
          updatedAt: now,
        })
        .where(eq(orders.id, orderId))
        .returning()
        .all();

      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      tx.insert(paymentAttempts)
        .values({
          id: attemptId,
          orderId,
          platform: 'razorpay',
          status: 'captured',
          referenceData: JSON.stringify({ paymentId, capturedAt: now.toISOString() }),
          createdAt: now,
        })
        .run();

      return updated;
    });
  }

  public async retryOrder(orderId: string, additionalMinutes: number = 1440): Promise<typeof orders.$inferSelect | undefined> {
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + additionalMinutes * 60 * 1000);

    return db.transaction((tx) => {
      const existing = tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).all();
      if (!existing[0]) return undefined;

      const [updated] = tx
        .update(orders)
        .set({
          status: 'pending',
          expiresAt: newExpiresAt,
          updatedAt: now,
        })
        .where(eq(orders.id, orderId))
        .returning()
        .all();

      return updated;
    });
  }
}

export const orderRepository = new OrderRepository();
