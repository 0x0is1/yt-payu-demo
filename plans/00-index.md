# Multi-Stage Project Plan: Index & Roadmap

This project implements a distributed payment generation and checkout architecture adhering to ACID, MVC, and SOLID principles.

## Stages Overview

| Stage | Document | Scope | Status |
|---|---|---|---|
| **Stage 0** | [00-index.md](./00-index.md) | Multi-stage roadmap, principles, and directory indexing | Finalized |
| **Stage 1** | [01-architecture-and-db.md](./01-architecture-and-db.md) | Data layer, ACID transactions, SQLite + Drizzle schema, Tax & GST Engine | Finalized |
| **Stage 2** | [02-backend-elysia.md](./02-backend-elysia.md) | Elysia REST + WebSocket gateway, MVC structure, Razorpay & Webhook handlers, `*.test.ts` | Finalized |
| **Stage 3** | [03-admin-mfe.md](./03-admin-mfe.md) | Admin MFE (:3000), Order ID generator, Dashboard, Manual UPI confirmation modal | Finalized |
| **Stage 4** | [04-checkout-mfe.md](./04-checkout-mfe.md) | Checkout MFE (:3001), Geolocation gate, State resolution, Dual payment options (Razorpay & UPI) | Finalized |
| **Stage 5** | [05-testing-and-verification.md](./05-testing-and-verification.md) | Playwright E2E suites (`*.spec.ts`), visual inspection, zero portaling & zero gradient audits | Finalized |

## Core Principles Checklist
- [x] **Zero Comments in Code**: Strictly no comments in any code files.
- [x] **ACID**: All database mutations executed within `db.transaction()` blocks.
- [x] **MVC**: Explicit separation of Models (`db/schema.ts`), Views (API DTOs / JSON), Controllers (`controllers/`), and Services (`services/`).
- [x] **SOLID**: High cohesion, interface decoupling, dedicated single-purpose classes/functions.
- [x] **Schema Validation**: Comprehensive Zod validation on all requests, forms, and DTOs.
- [x] **Component Hierarchy**: Global shadcn design system kit in `components/ui/`, route-specific subcomponents in route `components/`.
- [x] **Code Length Restriction**: Strictly no `page.tsx` exceeding 100 lines of code.
- [x] **UI Guardrails**: Solid golden & orangish palette only; no gradients, no emojis, no duotone text/icons, no portaling.
- [x] **Documentation Guardrail**: Strict enforcement: rules in `GEMINI.md` and `AGENTS.md` only; plans in `./plans/` only. No other docs.
