# ADR-005: Front-desk cashier — dual POS (Paystack + Moniepoint)

**Date:** 2026-07-16  
**Status:** Accepted (Tech Lead / CTO orchestration)  
**Deciders:** Tech Lead, Operations (Kalu sponsor alignment)  
**Traces to:** `00-business-context/business-case.md` · CravinsOS POS reference (`~/projects/cravinsos`)

## Context

Relief Hotels’ business case requires **secure booking and payment-ready reservation flow** and fewer **missed reservations** under a ~**N400k** envelope. Online guests already pay via **Paystack**. Front desk already supports **cash + Moniepoint** walk-ins.

Ops need a **cashier settle flow**: pick an existing reservation → collect deposit/balance → confirm — including **limited offline** operation when hotel Wi‑Fi drops (pattern proven in CravinsOS IndexedDB outbox).

Hoteliers may use **Paystack Terminal** and/or **Moniepoint** POS hardware. Locking to one provider creates ops risk and vendor lock-in.

## Decision

1. Build an **in-app staff cashier module** (not a standalone CravinsOS deploy).
2. Support **both** providers behind one settle API:
   - `cash`
   - `paystack_terminal` (Paystack Terminal push / payment request)
   - `moniepoint_terminal`
   - `moniepoint_transfer`
3. Reuse CravinsOS **patterns only** (cart/settle UX, offline outbox) — do not vendor the Vite SPA.
4. Deliver in **independent agent phases** with disjoint file ownership and merge order **G → H → I → J**.

## Options considered

| Option | Pros | Cons | Result |
|--------|------|------|--------|
| Moniepoint only | Already partially built | Blocks hotels on Paystack Terminal | Rejected |
| Paystack only | Aligns with online channel | Drops existing Moniepoint walk-in | Rejected |
| Dual adapter (this ADR) | Matches hardware reality; one UX | Two integrations to maintain | **Accepted** |
| Bundle CravinsOS wholesale | Fast POS UI | Wrong framework/domain; N400k overkill | Rejected |

## Consequences

**Positive:** One cashier UX; provider choice per desk; offline cash settle; KPI continuity (paid bookings).  
**Negative:** Dual webhook/polling paths; env surface grows (`PAYSTACK_TERMINAL_ID`, Moniepoint vars).  
**Mitigation:** Shared `CashierProvider` interface; simulate mode when keys missing (`DEMO_MODE`).

## Success criteria

- Staff can settle a pending reservation with cash, Paystack Terminal, or Moniepoint.
- Offline cash settlements queue and sync once without double-charge (`clientMutationId`).
- No Cravins catalog/inventory required for Phase 1–3.

## Rollback

Disable cashier route via env `CASHIER_ENABLED=false`; front desk falls back to walk-in create + existing Moniepoint dialog.
