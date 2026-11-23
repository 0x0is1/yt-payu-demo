# Stage 1: Architecture, Data Layer & ACID Transactions

## 1. Database & Persistence Layer
- **Engine**: Bun native SQLite (`bun:sqlite`) managed with Drizzle ORM.
- **ACID Transaction Guarantees**:
  - All operations updating order statuses (`pending` -> `paid`, `pending` -> `expired`), recording payment attempts, and fulfilling webhook events are enclosed in `db.transaction(async (tx) => { ... })`.
  - Rollbacks are automatically triggered upon any uncaught exception.

## 2. Drizzle Schema Specifications

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  identifierId: text('identifier_id').notNull().unique(),
  baseAmount: real('base_amount').notNull(),
  gstRate: real('gst_rate').notNull().default(18.0),
  cgst: real('cgst').notNull().default(0),
  sgst: real('sgst').notNull().default(0),
  igst: real('igst').notNull().default(0),
  totalAmount: real('total_amount').notNull(),

  customerName: text('customer_name'),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),
  addressLine: text('address_line'),
  city: text('city'),
  state: text('state'),
  country: text('country').default('India'),
  isForeign: integer('is_foreign', { mode: 'boolean' }).default(false),
  nationality: text('nationality').default('Indian'),
  latitude: real('latitude'),
  longitude: real('longitude'),

  status: text('status').notNull().default('pending'),
  paymentMethod: text('payment_method'),

  razorpayPaymentLinkId: text('rzp_payment_link_id'),
  razorpayPaymentLinkUrl: text('rzp_payment_link_url'),
  razorpayPaymentId: text('rzp_payment_id'),
  razorpayFee: real('rzp_fee').default(0),

  upiTransactionId: text('upi_transaction_id'),
  upiMarkedPaidAt: integer('upi_marked_paid_at', { mode: 'timestamp' }),
  upiConfirmedAt: integer('upi_confirmed_at', { mode: 'timestamp' }),

  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const paymentAttempts = sqliteTable('payment_attempts', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  platform: text('platform').notNull(),
  status: text('status').notNull(),
  referenceData: text('reference_data'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

## 3. GST Calculation & Pricing Engine
- **Merchant Registered State**: Configured in environment (`MERCHANT_STATE="Karnataka"` by default).
- **Tax Breakdown Matrix**:
  - **Foreign / International Customer** (`isForeign === true` or `country.toLowerCase() !== 'india'`):
    - Export of services (0% GST / Zero-rated).
    - `CGST = 0`, `SGST = 0`, `IGST = 0`.
    - `totalAmount = baseAmount`.
    - Payment option allowed: **Razorpay ONLY**.
  - **Domestic Intra-State Supply** (`customerState.toLowerCase() === merchantState.toLowerCase()` and `country === 'India'`):
    - `CGST = (baseAmount * (gstRate / 2)) / 100`
    - `SGST = (baseAmount * (gstRate / 2)) / 100`
    - `IGST = 0`
    - `totalAmount = baseAmount + CGST + SGST`.
    - Payment options allowed: Razorpay OR Manual UPI.
  - **Domestic Inter-State Supply** (`customerState.toLowerCase() !== merchantState.toLowerCase()` and `country === 'India'`):
    - `CGST = 0`
    - `SGST = 0`
    - `IGST = (baseAmount * gstRate) / 100`
    - `totalAmount = baseAmount + IGST`.
    - Payment options allowed: Razorpay OR Manual UPI.
- **Razorpay 2% Cut**:
  - `razorpayFee = Math.round((totalAmount * 0.02) * 100) / 100`
  - `razorpayTotal = totalAmount + razorpayFee`
