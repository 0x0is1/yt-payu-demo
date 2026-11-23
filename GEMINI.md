# Project Rules & Constraints

## 1. System Architecture & Coding Standards
- **Backend Service**: Bun.js with Elysia framework, WebSockets (`ws`), and PostgreSQL via Drizzle ORM (`drizzle-orm/postgres-js`).
- **Database Engine**: PostgreSQL 17 running locally on `localhost:5432/payu_demo` with atomic transactions (`db.transaction`).
- **Admin MFE**: Next.js App Router with shadcn/ui on port 3000.
- **Checkout MFE**: Next.js App Router with shadcn/ui on port 3001.
- **Zero Comments Rule**: Do NOT write any comments in code files (no `//`, `/* */`, `<!-- -->`, `{/* */}`). Only pure, clean, self-documenting code.
- **No One-Sided Borders Rule**: Strictly BANNED. Do NOT use `border-t`, `border-b`, `border-l`, `border-r`, `border-t-4`, etc. All borders must be uniform all-sided borders (`border`, `border-2`, `border-slate-200`, etc.) or `border-transparent`/`border-none`.
- **No Mock Data Rule**: Do NOT show, generate, or rely on mock data or mock fallbacks. All operations must connect to real APIs (Razorpay test APIs with `rzp_test_2xGYyaqTbp0HNw`, OpenStreetMap Nominatim, real database rows).
- **Architectural Principles**:
  - **ACID**: All database state changes (order creation, status changes, payment capture, UPI verification, bank verification) must execute inside atomic transactions (`db.transaction`).
  - **MVC / Layered Architecture**: Strict separation: Models (`db/schema.ts`), Controllers (HTTP routing & responses), Services (business logic, tax engine, Razorpay client), Repositories/Data Access.
  - **SOLID**: Single Responsibility per service/controller, Open/Closed for payment gateways, Interface Segregation, and Dependency Inversion.
  - **Schema Validation**: Comprehensive Zod schema validation across all request payloads, form steps, and data boundaries.
- **Component Hierarchy & File Length**:
  - **Page Line Limit**: NO `page.tsx` file may exceed **100 lines of code**. If approaching the limit, decompose into subcomponents within a local `components/` folder for that route.
  - **Global vs Local Components**: Generic reusable UI belongs in global `components/ui/` (from shadcn design system UI kit); route-specific blocks belong in local `components/` directories.
  - **Reuse Existing UI**: Utilize shadcn/ui kit components (Button, Input, Card, Badge, Label, Alert, Table, etc.) rather than authoring custom UI widgets from scratch.
  - **State Management**: Utilize React Context API and custom hooks with clean folder structures for checkout state, geolocation state, and WebSocket streams.

## 2. Design & Styling Constraints
- **Color Scheme**: Solid golden and orangish color scheme only (e.g., Amber `#D97706`, Gold `#F59E0B`, Orange `#EA580C`).
- **No Gradients**: Strictly disallowed. All backgrounds, borders, and accents must use solid colors.
- **No Emojis**: Absolutely no emojis in any UI, labels, buttons, or messaging.
- **No Duotone Elements**: No duotone text, no duotone icons, no opacity fades mimicking duotone.
- **Icon Pack**: Solid monochrome `lucide-react` icons with single color stroke/fill.
- **No Portaling**: No UI portaling to `document.body`. All dialogs, sheets, menus, tooltips, and popups must render inline in DOM flow without `@radix-ui/react-portal`.

## 3. Taxation & Pricing Rules
- **Backend Pricing Calculation**: Dynamic pricing along with all GST and tax breakdowns must be calculated strictly by the backend API (`POST /api/orders/:identifierId/calculate-pricing`) after state, country, and nationality are supplied. Frontend must never calculate or alter taxes or final totals.
- **Services GST Matrix**:
  - Dynamic Calculation: Admin does NOT select GST rate or input consumer data. Admin inputs only Base Amount and Program Duration (1, 2, 3, 6, 12 months, or Free Trial).
  - Merchant Registered State: Configurable in `.env` as `MERCHANT_STATE` (default: "Karnataka").
  - Intra-state (Customer state == Merchant state, Country == India): Split into equal **CGST** and **SGST** (9% + 9% = 18%).
  - Inter-state (Customer state != Merchant state, Country == India): Single **IGST** (18%).
  - International / Foreign Customer (Country != India or Foreign toggle active): Export of services treated as 0% GST (Zero-rated export supply).
  - Free Trial: 0% GST and 0 cost.
- **Payment Method Availability by Nationality**:
  - Indian Domestic Customers: Dual options available: **UPI** (0% fee) and **Direct Bank Transfer** (0% fee).
  - Foreign / International Customers: **Razorpay ONLY** (Manual UPI and Bank Transfer are hidden as domestic systems do not support international payments).
- **Razorpay 3rd-Party Charges**: Razorpay payment option adds a 2% gateway cut calculated on the backend.

## 4. Location & Geolocation Policy
- **Navigator Geolocation**: Checkout MFE requests web `navigator.geolocation` permissions upon member onboarding.
- **Blocking State**: If location access is denied or blocked, display a blocking screen directing the user to manually enable location permissions in browser settings.
- **Reverse Geocoding**: Backend proxy endpoint `/api/location/resolve-state` using OpenStreetMap Nominatim resolves coordinates to the Indian state and country.
- **State Field Immutability**: The State input field MUST be disabled and populated strictly from the reverse-geocoded coordinates.
- **Foreign Customer Toggle**: UI provides a button/toggle to declare foreign nationality, triggering international pricing rules and restricting payment options to Razorpay.

## 5. Webhooks & Payment Processing
- **Razorpay Webhook**: Listens for `payment.captured` with HMAC-SHA256 signature verification matching `D:/codes/fw-flextudy/services`.
- **Test Credentials**: Copied from `D:/codes/fw-flextudy/services/.env.local`.
- **Razorpay Checkout & Desktop Mode**: Generates official Razorpay Order IDs (`rzp_order_id`) and opens Razorpay Checkout.js modal directly on desktop, preventing the mobile-wrapper layout of standard payment links.
- **Frontend Payment Verification Gate**: Frontend explicitly enters `verifying_payment` loading state and awaits verification from backend (`POST /api/orders/:identifierId/verify-razorpay`) before displaying the success screen.
- **Razorpay Return URL**: Redirects to `http://localhost:3001/pay/:identifierId?status=success` displaying receipt after backend verification.
- **Real-Time Updates**: Elysia WebSocket broadcast (`/ws/admin`) immediately alerts the Admin MFE when a payment is captured or marked.
- **Manual UPI**: Displays merchant UPI ID (configurable via `MERCHANT_UPI_ID`), auto-generated dynamic UPI QR code, copy button, and "Done - I Have Paid via UPI" button (for domestic customers). Admin confirms via modal.
- **Direct Bank Transfer**: Displays Merchant Bank Details (Account Number, IFSC, Account Name, Bank Name) and "Done - I Have Transferred via Bank" button. Customer submits UTR/reference number. Admin confirms via modal.
- **Free Trial**: Directly activated with zero cost.
- **Link Expiry & Retry**: Selector includes 30m, 2h, 24h, 7d, and **No Expiry (Never Expires)**. Retry button extends expiry (+24h) keeping the same link identifier active.

## 6. Testing & Quality Requirements
- **Backend Tests**: All backend endpoints and tax calculations must have comprehensive test suites (`*.test.ts`) executed with `bun test`.
- **Frontend Tests**: Full Playwright test suites (`*.spec.ts`) covering admin generation, geolocation blocking/granting, state auto-population, foreign customer flow, Razorpay redirection, and UPI workflows.
- **Documentation Policy**: Write every rule in `GEMINI.md` and `AGENTS.md`. Write NO OTHER docs.
