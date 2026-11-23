# Stage 5: Testing, Playwright E2E & Verification

## 1. Testing Strategy

### Unit & Integration Tests (Backend: `bun test`)
- Run via `bun test` in `backend/`.
- Test Files:
  - `backend/tests/taxEngine.test.ts`:
    - Intra-state (Karnataka): 9% CGST + 9% SGST (18%) or 2.5% + 2.5% (5%).
    - Inter-state (e.g. Maharashtra): 18% or 5% IGST.
    - Foreign / International: 0% GST (Zero-rated export).
    - Razorpay 2% convenience fee computation.
  - `backend/tests/orderRepository.test.ts`: Verifies ACID transactions, rollbacks, and atomic state transitions.
  - `backend/tests/orders.test.ts`: Verifies order generation, identifier lookup, dynamic pricing calculation endpoint, and expiry retry logic.
  - `backend/tests/webhooks.test.ts`: Verifies HMAC-SHA256 signature calculation, rejection of forged signatures, and atomic fulfillment on `payment.captured`.

### End-to-End Tests (Frontends: `npx playwright test`)
- Installed in root or `tests/e2e/`.
- Test Files:
  - `tests/e2e/admin-flow.spec.ts`:
    1. Visits `http://localhost:3000`.
    2. Enters amount, optional name, addresses, selects GST rate and expiry, clicks "Generate Pay Link".
    3. Confirms payment link generation and public identifier format.
    4. Navigates to `/orders`, verifies order in the table, verifies attempts view.
  - `tests/e2e/checkout-flow.spec.ts`:
    1. Visits checkout link with simulated denied geolocation; verifies blocking view is displayed.
    2. Visits with granted geolocation (mock coordinates); verifies state is populated and input is disabled.
    3. Verifies backend dynamic pricing call returns tax breakdown.
    4. Toggles Foreign Customer mode; verifies GST changes to 0% and Manual UPI option disappears leaving ONLY Razorpay.
    5. Clicks Razorpay; verifies extra 2% fee is rendered and redirect link is fetched.
  - `tests/e2e/upi-flow.spec.ts`:
    1. Domestic user selects Manual UPI; verifies embedded UPI ID, dynamic QR code, and "I Have Paid" button.
    2. Clicks "I Have Paid"; verifies order changes to pending confirmation.
    3. Admin MFE receives live WebSocket update; admin enters transaction ID and confirms.
    4. Verifies database and both UIs reflect `paid` status.

## 2. Visual & Architectural Audit
- Verify no `page.tsx` file in either MFE exceeds 100 lines.
- Verify zero comments across all code files.
- Verify zero CSS gradients in Tailwind config and styles.
- Verify zero emojis in HTML text or JSX.
- Verify zero duotone icons or portaled elements.
- Verify all rules are preserved solely within `GEMINI.md`, `AGENTS.md`, and `./plans/`.
