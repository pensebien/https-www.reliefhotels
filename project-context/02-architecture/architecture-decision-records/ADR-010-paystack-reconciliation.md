# ADR-010: Paystack reconciliation — read-only diff report

**Date:** 2026-08-13
**Status:** Accepted
**Deciders:** Tech Lead
**Traces to:** `hms-expansion-roadmap.md`, `src/lib/accounting/ledger.ts` (Agent M)

## Context

**Phase 0 requirement:** none — Wave 2, Phase 3 of the in-house HMS.

The accounting ledger (`src/lib/accounting/ledger.ts`, Agent M) is a read-only summary built entirely from Relief's own `payments` records. It has never cross-checked that against what Paystack itself actually processed — if a webhook was missed, a manual DB edit happened, or a payment succeeded on Paystack's side without the local record catching up (or vice versa), nothing in the app would ever surface that gap.

## Decision

1. `reconcilePaystackTransactions(range)` (`src/lib/accounting/paystack-reconcile.ts`) fetches Paystack's `GET /transaction` for a manager-chosen date range (via the existing `paystackFetch` helper — `src/lib/paystack-auth.ts`), and compares it against local payments in the same range that resolve to the `paystack` channel (reusing `resolveLedgerChannel` from the existing ledger module, rather than re-deriving channel logic).
2. The comparison itself — `diffPaystackTransactions(local, remote)` — is a **pure function**, independent of the network-fetching wrapper, so it's directly unit-testable without hitting Paystack (matches this codebase's existing convention of splitting pure logic from network calls, e.g. `rayza-connect.ts`'s `parseRayzaErrorBody`/`bookingReferenceFor`).
3. Four discrepancy types: `amount_mismatch`, `status_mismatch`, `missing_on_paystack` (a local "success" payment Paystack has no record of), `missing_locally` (a Paystack "success" transaction with no local record at all).
4. **Read-only, always.** The endpoint (`GET /api/staff/accounting/reconcile`, `manager` only) returns a report; nothing about a discrepancy is ever auto-corrected. A human decides what a mismatch means and what to do about it.
5. Demo mode / no live Paystack keys → returns `{ demo: true, discrepancies: [] }` rather than erroring or making a real API call that would fail anyway.
6. Surfaced in `/staff/accounting` as a panel driven by the same date-range filter already on that page (`AccountingDateFilter`) — one date picker, not two.

## Options considered

| Option | Pros | Cons | Result |
|--------|------|------|--------|
| Auto-correct local records on mismatch | "Fixes" the problem immediately | Silently rewriting financial records from a background diff is exactly the kind of thing that causes worse incidents than the mismatch itself | Rejected |
| Webhook-based real-time reconciliation | Catches drift immediately | This project has no webhook receiver for Paystack today (`integration-points.md` §2 notes "Webhooks: Optional v2 — v1 uses redirect verify only"); building one is a bigger, separate piece of work | Rejected for this phase |
| On-demand, manager-triggered report (this ADR) | Small, safe, fits the existing accounting page and ADR precedent (RAYZA's cancel-idempotency, cashier idempotency) of "verify against source of truth without guessing" | Not real-time — drift between runs isn't caught until someone runs it | **Accepted** |

## Consequences

**Positive:** a real gap between "what we think happened" and "what Paystack says happened" now has a way to be found, without any risk of an automated process corrupting financial data.
**Negative:** requires a manager to remember to run it; no alerting if nobody does.
**Mitigation:** none needed for this phase — matches the existing manual-CSV-export pattern already accepted for the ledger; could grow into a scheduled job later if the business wants it.

## Success criteria

- Running reconciliation over a range with no drift returns zero discrepancies.
- A manually-edited local amount (simulating drift) is caught as `amount_mismatch` when checked against Paystack.
- `cashier`/`cleaner_head`/`restaurant_owner` sessions get 403 from the reconcile endpoint; `manager` succeeds.

## Rollback

Remove the panel from `/staff/accounting` — the endpoint itself has no write path to roll back from.
