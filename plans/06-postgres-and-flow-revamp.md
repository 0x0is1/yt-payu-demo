# Stage 6 Plan: PostgreSQL Migration & Dynamic Flow Revamp

## Objective
1. Complete migration from SQLite (`bun:sqlite`) to PostgreSQL 17 (`drizzle-orm/postgres-js` with `postgres`).
2. Remove GST slab selection and consumer prefill inputs from Admin Generator form. Admin only specifies Base Amount, Program Duration (or Free Trial), Order ID, and Link Validity (including "No Expiry").
3. Update Checkout MFE: Capture customer name and location on link open; for Indian customers display UPI and Bank transfer options; for International customers display Razorpay only (0% export GST). Free trial zero-cost activation.
4. Eliminate mid-flow crashes (unhandled null expiry dates, geocoding timeouts, strict validation blocks, DB locks).
5. Ensure 100% local operation on ports 4000 (Backend), 3000 (Admin MFE), 3001 (Checkout MFE).

## Architecture Changes
- **Database**: PostgreSQL 17 `payu_demo` database, Drizzle ORM `pgTable`.
- **Admin MFE**: Form with Amount, Program Duration (Free Trial / 1..12 Months), Order ID auto-sync, Validity (30m, 2h, 24h, 7d, No Expiry).
- **Checkout MFE**: Location captured on link open, customer name entry, Indian customers see UPI + Bank options, International customers see Razorpay options only.
- **Backend**: Bank transfer claim and confirmation endpoints (`/api/orders/:identifierId/mark-bank-paid`, `/api/admin/orders/:id/confirm-bank`).
