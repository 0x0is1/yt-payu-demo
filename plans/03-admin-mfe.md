# Stage 3: Admin MFE (Next.js :3000)

## 1. Directory Structure & Component Layering

```
apps/admin-mfe/
├── app/
│   ├── layout.tsx                    # Root layout with solid golden theme provider
│   ├── page.tsx                      # (< 100 lines) Link Generator screen
│   ├── orders/
│   │   ├── page.tsx                  # (< 100 lines) Requests dashboard & retry
│   │   └── components/               # Route-level components
│   │       ├── OrdersTable.tsx       # Orders list with badges
│   │       ├── RetryButton.tsx       # Retry action trigger
│   │       ├── AttemptsModal.tsx     # Inline payment attempts viewer (no portaling)
│   │       └── ConfirmUpiModal.tsx   # Inline UPI transaction input (no portaling)
│   └── components/                   # Route-level components for link generator
│       ├── GeneratorForm.tsx         # Amount, name, address, state, order ID inputs
│       ├── GeneratedLinkCard.tsx     # Copyable payment link display
│       └── TaxBreakdownCard.tsx      # CGST/SGST/IGST live simulation
├── components/
│   ├── ui/                           # Global shadcn design system UI kit
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── label.tsx
│   │   └── table.tsx
│   └── icons/                        # Solid monochrome iconpack
├── context/
│   ├── AdminOrdersContext.tsx        # React Context for orders & retry state
│   └── WebSocketContext.tsx          # Real-time WebSocket listener
└── hooks/
    ├── useAdminOrders.ts             # Custom hook for fetching & filtering orders
    └── useWebSocketStream.ts         # Custom hook for ws://localhost:4000/ws/admin
```

## 2. Page Specifications & Constraints

### Link Generator (`app/page.tsx`)
- Must not exceed 100 lines of code.
- Inputs:
  - Base Amount (required number)
  - Order ID (optional, auto-generated alphanumeric code, synchronized with backend)
  - Customer Name (optional)
  - Customer Address (building, city, state, nationality - optional)
  - Tax Slab selector (18% default, 5% option)
- "Generate Pay Link" Action:
  - Submits to backend `POST /api/orders/generate-link`.
  - Displays generated URL: `http://localhost:3001/pay/:identifierId`.
  - Quick copy button and QR preview.

### Orders Dashboard (`app/orders/page.tsx`)
- Must not exceed 100 lines of code.
- Data table listing:
  - Order ID & Public Identifier
  - Base Amount, CGST/SGST/IGST, Total Amount
  - Status: `pending`, `paid`, `expired`, `upi_claimed`
  - Payment Attempts: list of attempted platforms (Razorpay, Manual UPI)
  - Actions:
    - If `expired`: "Retry" button (calls `POST /api/admin/orders/:id/retry`).
    - If `upi_claimed`: "Confirm UPI" button (opens inline modal to input transaction ID).
- Real-time updates: List auto-updates when WebSocket receives payment capture or UPI claim.

## 3. Strict UI Guidelines
- Primary Color: Amber-600 (`#D97706`), Gold-500 (`#F59E0B`), Orange-600 (`#EA580C`).
- Zero gradients, zero emojis, zero duotone icons.
- All modals render inline in the DOM flow with `portal={false}` or custom non-portaled container.

