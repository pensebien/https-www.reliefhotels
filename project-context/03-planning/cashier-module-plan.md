# Cashier Module — Phased Implementation Plan

**Status:** Active (2026-07-16)  
**ADR:** [ADR-005](../02-architecture/architecture-decision-records/ADR-005-cashier-dual-pos.md)  
**Business case:** `00-business-context/business-case.md` — paid bookings, fewer missed reservations, payment-ready ops  
**KPI:** 20 paid bookings/month (front-desk convert unpaid holds → paid)

## Problem

Hotelier needs to **select a guest reservation** and **checkout** (deposit/balance) at the desk using **Paystack POS and/or Moniepoint**, with **offline-tolerant** cash capture (CravinsOS outbox pattern).

## Non-goals (this wave)

- Full F&B / minibar catalog POS (future)
- Replacing guest Paystack web checkout
- Shipping CravinsOS as a submodule
- SMS/WhatsApp (ADR-003) — still deferred for launch ops email + staff portal

## Agent map (conflict-free ownership)

| Phase | Agent | Branch | Worktree | **Owns exclusively** |
|-------|-------|--------|----------|----------------------|
| **G** Contracts | G | `features/agent-g-cashier-contracts` | `agent-workspaces/agent-g-cashier-contracts/` | `project-context/**` cashier docs, `docs/contracts`, `docs/deploy/STAFF.md`, `docs/supabase/migration-008*`, ENV notes |
| **H** API | H | `features/agent-h-cashier-api` | `agent-workspaces/agent-h-cashier-api/` | `src/lib/cashier/**`, `src/lib/paystack-terminal.ts`, `src/app/api/staff/cashier/**`, `src/lib/schemas/cashier-*.ts`, `tests/api/cashier-*.ts` |
| **I** UI | I | `features/agent-i-cashier-ui` | `agent-workspaces/agent-i-cashier-ui/` | `src/features/cashier/**`, `src/app/[locale]/staff/cashier/**`, `messages` key `"cashier"` only |
| **J** Offline | J | `features/agent-j-cashier-offline` | `agent-workspaces/agent-j-cashier-offline/` | `src/lib/cashier-offline/**` only |

**Merge order:** `G → H → I → J → main`  
Agents **must not** edit another agent’s paths. Shared types for UI: Agent H exports from `src/lib/cashier/types.ts`; Agent I may duplicate a thin DTO until H merges if needed.

## Phases

### Phase G — Contracts & schema (docs)

- ADR-005 accepted in architecture index
- API contract: `POST /api/staff/cashier/settle`, `GET .../status`
- Migration 008: payment_method allows `paystack_terminal`; optional `client_mutation_id` unique
- ENV: `PAYSTACK_TERMINAL_ID`, `CASHIER_ENABLED`
- Acceptance: docs reviewable; no app behavior change

### Phase H — Settle API + dual providers

- `CashierProvider` interface: `cash` | `paystack_terminal` | `moniepoint_terminal` | `moniepoint_transfer`
- Paystack Terminal: payment request + terminal event (simulate when no terminal id)
- Moniepoint: reuse existing `src/lib/moniepoint.ts` from cashier adapter (import only — do not rewrite Moniepoint module unless bugfix)
- Idempotent settle by `clientMutationId`
- Acceptance: API tests for cash settle + simulated Paystack/Moniepoint pending→success

### Phase I — Staff cashier UI

- Route: `/[locale]/staff/cashier` (staff portal layout)
- Pick reservation (pending / unpaid) → amount → provider → await / confirm
- Wire to Phase H API
- Acceptance: demo key staff can settle a seed pending reservation with cash in UI

### Phase J — Offline outbox

- IndexedDB queue for cash (and optionally transfer intents)
- Flush on `online`; skip double apply via `clientMutationId`
- Acceptance: offline cash → reconnect → one payment row + reservation confirmed

## Reference implementation

CravinsOS (`~/projects/cravinsos`): `src/lib/offline/*`, `PaymentCheckoutModal`, Moniepoint checkout — **patterns only**.

## Deploy

After each PR merge to `main`, Netlify auto-deploy. Production requires Supabase + provider keys per `docs/deploy/STAFF.md`.
