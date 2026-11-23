# Stage 2: Backend Service (Bun + Elysia + WS)

## 1. Directory & Layered MVC Structure

```
backend/
├── src/
│   ├── index.ts                      # Main Elysia app, CORS, WS routes
│   ├── db/
│   │   ├── client.ts                 # SQLite connection
│   │   └── schema.ts                 # Drizzle schemas
│   ├── repositories/
│   │   └── orderRepository.ts        # ACID database transactions
│   ├── services/
│   │   ├── taxEngine.ts              # CGST/SGST/IGST + Foreign 0% + Razorpay fee
│   │   ├── razorpay.ts               # Razorpay API client & HMAC verification
│   │   ├── geocoding.ts              # Lat/Long to State & Country converter
│   │   └── notificationService.ts    # WebSocket broadcaster
│   ├── controllers/
│   │   ├── orderController.ts        # Admin create order, public lookup, retry
│   │   ├── checkoutController.ts     # Dynamic pricing, customer address, location
│   │   ├── paymentController.ts      # Mint Razorpay link, Mark UPI paid, Confirm UPI
│   │   └── webhookController.ts      # Razorpay payment.captured webhook
│   ├── validators/
│   │   └── schemas.ts                # Zod schemas for validation
│   └── ws/
│       └── adminGateway.ts           # /ws/admin connection handler
└── tests/
    ├── taxEngine.test.ts             # Tax engine tests (intra, inter, foreign, fee)
    ├── orderRepository.test.ts       # ACID transaction tests
    ├── orders.test.ts                # REST endpoint tests
    └── webhooks.test.ts              # HMAC verification & payment capture tests
```

## 2. API Endpoints Specification

### Orders & Links
- `POST /api/orders/generate-link`: Admin endpoint. Accepts `orderId` (optional, auto-generated if absent), `baseAmount`, `gstRate` (18 or 5), `expiryMinutes` (30m/2h/24h/7d), optional `customerName`, `address`, `state`, `nationality`. Generates unique `identifierId`.
- `GET /api/orders/:identifierId`: Public lookup. Returns order details, admin prefilled data, and expiration status.
- `POST /api/orders/:identifierId/calculate-pricing`: Accepts `{ state, country, isForeign }`. Computes exact CGST, SGST, IGST, totalAmount, Razorpay 2% fee, and available payment methods (`['razorpay']` if foreign, `['razorpay', 'manual_upi']` if domestic). Updates order pricing in DB within an ACID transaction.
- `POST /api/orders/:identifierId/customer-details`: Customer submits/updates name, phone, email, building, city, state, country, and foreign status.
- `GET /api/admin/orders`: Admin dashboard endpoint. Returns all orders, their statuses, payment attempts, and retry availability.
- `POST /api/admin/orders/:id/retry`: Extends an expired order with +24 hours expiration.

### Geolocation Resolution
- `POST /api/location/resolve-state`: Accepts `{ latitude, longitude }`, queries OpenStreetMap Nominatim reverse-geocoding API, and returns `{ state: "Karnataka", country: "India", isForeign: false }`.

### Payments
- `POST /api/orders/:identifierId/razorpay-link`: Backend verifies amount, calls Razorpay `/v1/payment_links` with callback URL, stores link in DB within an ACID transaction, and returns `{ paymentLinkUrl }`.
- `POST /api/orders/:identifierId/mark-upi-paid`: Domestic customer clicks "I have paid", records timestamp, notifies admin via WebSocket. (Rejected with 400 if foreign order).
- `PATCH /api/admin/orders/:id/confirm-upi`: Admin inputs `upiTransactionId`, changes status to `paid`, stores transaction in DB.

### Webhook
- `POST /api/webhooks/razorpay`: Verifies `X-Razorpay-Signature` against raw body with `RAZORPAY_WEBHOOK_SECRET`. On `payment.captured`, fulfills order and broadcasts over WebSocket.

## 3. Elysia WebSocket Channel
- Path: `/ws/admin`
- Events broadcasted: `ORDER_CREATED`, `PAYMENT_CAPTURED`, `UPI_PAID_CLAIMED`, `UPI_CONFIRMED`.
