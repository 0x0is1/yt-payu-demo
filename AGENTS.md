# Agent Roles & Guidelines

## General Operating Principles
- **Zero Comments in Code**: Strictly do NOT write any comments in code files (`//`, `/* */`, `<!-- -->`, `{/* */}`). Code must be clean, self-explanatory, and comment-free.
- **No One-Sided Borders Rule**: Strictly BANNED. Do NOT use `border-t`, `border-b`, `border-l`, `border-r`, `border-t-4`, etc. All borders must be uniform all-sided borders (`border`, `border-2`, `border-slate-200`, etc.) or `border-transparent`/`border-none`.
- **No Mock Data Rule**: Do NOT show, generate, or rely on mock data or mock fallbacks. All operations must connect to real APIs (Razorpay test APIs with `rzp_test_2xGYyaqTbp0HNw`, OpenStreetMap Nominatim, real database rows).
- **No Other Documentation**: Strictly maintain all operational and architectural rules within `GEMINI.md` and `AGENTS.md`. Do not create README files or supplementary docs outside `./plans/`.
- **Indexed Plans**: All multi-stage planning documents reside in `./plans/` with numerical prefixes.
- **Verification Requirement**: Frontends must be validated visually and programmatically using Playwright (`*.spec.ts`) after implementation is complete.
- **Architectural Standards**:
  - Adhere strictly to ACID transaction guarantees, MVC separation of concerns, and SOLID design principles.
  - No `page.tsx` file may exceed 100 lines of code. Split into local route-level components in a local `components/` directory.
  - Global reusable components must be in `components/ui/` based on the shadcn design system UI kit.
  - Use React Context API and custom hooks for structured state management.
  - Enforce Zod schema validation across all API boundaries and form inputs.

## Swarm / Subagent Responsibilities

### 1. Backend Engineer (Bun + Elysia :4000)
- Owns `backend/`.
- Writes clean code with zero comments.
- Enforces MVC: Models (`db/schema.ts`), Controllers (`controllers/`), Services (`services/`), Repositories (`repositories/`).
- Enforces ACID transactions across all order, payment, and webhook mutations using Drizzle PostgreSQL transactions.
- Configures Elysia REST routes, WebSocket connections (`ws`), Drizzle ORM PostgreSQL (`postgres.js`) database, and migration scripts.
- Implements Razorpay integration using credentials from `D:/codes/fw-flextudy/services/.env.local`. No mock data.
- Implements HMAC-SHA256 webhook signature verification for `payment.captured`.
- Implements Indian GST taxation engine:
  - Intra-state (Customer state == Merchant state "Karnataka"): equal CGST + SGST (18%).
  - Inter-state (Customer state != Merchant state): single IGST (18%).
  - Foreign customer / international: 0% GST (Zero-rated export).
  - Free trial: 0% GST.
  - Razorpay fee calculation (+2% gateway fee).
- Implements dynamic pricing endpoint (`POST /api/orders/:identifierId/calculate-pricing`).
- Implements OpenStreetMap Nominatim reverse-geocoding proxy (`/api/location/resolve-state`) resolving both state and country.
- Supports No Expiry (`expiresAt: null`), program durations (1, 2, 3, 6, 12 months, or Free Trial), UPI and Bank Transfer flows.
- Writes comprehensive unit and integration tests (`*.test.ts`) using `bun test`.

### 2. Admin MFE Engineer (Next.js :3000)
- Owns `apps/admin-mfe/`.
- Writes clean code with zero comments.
- Enforces uniform all-sided borders only. No one-sided borders.
- Maintains page length strictly < 100 lines per `page.tsx`, extracting logic into route-level `components/`.
- Uses Context API (`AdminOrdersContext`, `WebSocketContext`) and custom hooks (`useAdminOrders`, `useWebSocketStream`).
- Enforces golden and orangish solid color scheme without gradients, emojis, or duotone icons.
- Ensures all dialogs, sheets, and popups are rendered inline without portaling.
- Reuses shadcn/ui components (`Button`, `Input`, `Table`, `Badge`, `Card`, `Select`, etc.).
- Builds Order Generator form (Amount, Program Duration 1-12m/Free Trial, auto-synced Order ID, expiry selector 30m/2h/24h/7d/No Expiry, Generate Pay Link). Does NOT ask admin for consumer details or GST rate.
- Builds Admin Dashboard (listing all requests by Order ID, showing payment attempts & platforms, nationality, program duration, retry button to extend expired links +24h).
- Connects to backend WebSocket (`/ws/admin`) for real-time payment notifications.
- Builds manual UPI confirmation interface allowing the admin to input transaction ID and verify receipt.
- Builds Direct Bank Transfer confirmation interface allowing admin to verify UTR/reference and mark paid.

### 3. Checkout MFE Engineer (Next.js :3001)
- Owns `apps/checkout-mfe/`.
- Writes clean code with zero comments.
- Enforces uniform all-sided borders only. No one-sided borders.
- Maintains page length strictly < 100 lines per `page.tsx`, extracting sub-views into route-level `components/`.
- Uses Context API (`CheckoutContext`, `GeolocationContext`) and custom hooks (`useCheckoutSession`, `useGeolocationState`).
- Enforces golden and orangish solid color scheme without gradients, emojis, or duotone icons.
- Ensures all components render inline without portaling.
- Reuses shadcn/ui components.
- Implements identifier token lookup (`/pay/:identifierId`).
- Implements member onboarding: collects Member Name upon clicking/opening link, then proceeds to location and payment.
- Implements `navigator.geolocation` gate: blocks UI if denied/unavailable, displays step-by-step instructions to enable permissions.
- Implements disabled State field automatically resolved via backend reverse-geocoding from coordinates.
- Implements Foreign / International Customer detection & button:
  - Displays nationality badge and "Foreign / International Customer" button/toggle.
  - Sends state & country to backend to fetch live tax and pricing calculations.
  - For foreign customers: completely hides manual UPI and bank transfer, displaying ONLY Razorpay option.
- Displays payment options:
  - Domestic Indian: Dual options (UPI OR Direct Bank Transfer with zero fee). Done button ("Done - I Have Paid via UPI" / "Done - I Have Transferred via Bank") records claim and enters real-time status view.
  - Foreign / International: Razorpay ONLY (2% gateway cut, international card support, 0% export GST). Opens Razorpay Checkout.js in desktop mode on PC rather than narrow phone wrapper, and awaits backend payment verification before showing the success screen.
  - Free Trial: Direct zero-cost activation button.

### 4. QA & Verification Specialist (Playwright)
- Installs Playwright as a dev dependency.
- Writes clean test code with zero comments.
- Writes end-to-end tests in `tests/e2e/*.spec.ts` testing the complete flow across Admin and Checkout MFEs.
- Tests geolocation permission grant and denial scenarios.
- Tests domestic vs foreign customer pricing calculations and payment option filtering (Razorpay only for foreign).
- Verifies visual compliance: solid colors, no gradients, no duotone elements, no emojis, no portaling, page line limits, zero comments in code files.
- Runs `npx playwright test` and verifies results.
