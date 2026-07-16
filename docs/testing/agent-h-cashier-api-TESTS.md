# Agent H — Cashier settle API tests (ADR-005 / Phase H)

**Scope:** `src/lib/cashier/**`, `src/lib/paystack-terminal.ts`, `src/app/api/staff/cashier/**`, `src/lib/schemas/cashier-settle.ts`.
**Branch:** `features/agent-h-cashier-api`
**Contract:** `docs/contracts/api-v1.md` § "Staff cashier settle (ADR-005)"

## What was built

| Endpoint | Purpose |
|----------|---------|
| `POST /api/staff/cashier/settle` | Settle a reservation with `cash` \| `paystack_terminal` \| `moniepoint_terminal` \| `moniepoint_transfer`. Idempotent on `clientMutationId`. |
| `GET /api/staff/cashier/settle/status?reference=&key=` | Poll a pending settle. Syncs Moniepoint (existing `syncMoniepointPushPayment`) or Paystack Terminal (new `syncPaystackTerminalPayment`); `?demo=1` force-promotes a simulated Paystack Terminal payment to `success`. |

Both routes are key-gated with `DEMO_DASHBOARD_KEY` via `key` query param **or** `x-demo-key` header.

### Files added

- `src/lib/cashier/types.ts` — `CashierPaymentMethod`, provider/result types, `PaymentRecord.paymentMethod` cast helpers.
- `src/lib/cashier/reference.ts` — `cashierPaymentReference()` (`RH-CASH-`, `RH-PSTM-`, `RH-MPOS-`, `RH-MPTF-`).
- `src/lib/cashier/store.ts` — in-memory `clientMutationId → reference` idempotency index + Paystack Terminal provider metadata (`invoiceId`, `offlineReference`, `providerTerminalId`). See note below.
- `src/lib/cashier/providers.ts` — `CashierProvider` per method; Moniepoint providers wrap the existing `pushTerminalPayment`/`pushTransferPayment` (`src/lib/moniepoint.ts`, imported only).
- `src/lib/cashier/settle-service.ts` — `settleCashierPayment()` and `getCashierSettleStatus()` orchestration (reservation lookup, idempotency replay, provider dispatch, reservation confirm).
- `src/lib/paystack-terminal.ts` — Paystack Terminal adapter: create invoice (`POST /paymentrequest`) → push to terminal (`POST /terminal/:id/event`) → poll (`GET /paymentrequest/:id`); simulate mode when `DEMO_MODE=true` or `PAYSTACK_SECRET_KEY`/`PAYSTACK_TERMINAL_ID` missing.
- `src/lib/schemas/cashier-settle.ts` — `cashierSettleSchema` (zod).
- `src/app/api/staff/cashier/settle/route.ts`, `src/app/api/staff/cashier/settle/status/route.ts`.
- `tests/api/cashier-settle.test.ts`.

### Design note — idempotency & Paystack metadata storage

`PaymentRecord` (owned by `src/lib/demo-store.ts`, out of this agent's file scope) has no
`clientMutationId`/`offline_reference`/`provider_terminal_id` fields, even though
`docs/supabase/migration-008-cashier.sql` already adds those columns for a future
Supabase-backed implementation. To stay inside this agent's exclusive paths, the
`clientMutationId → reference` mapping and Paystack Terminal invoice metadata are kept in an
**in-memory, process-scoped cache** (`src/lib/cashier/store.ts`), the same pattern already used
for the Moniepoint access-token cache in `src/lib/moniepoint.ts`. This fully satisfies the demo/
file-store deployment target and the idempotent-replay test below. Wiring it to the migrated
Supabase columns is a small follow-up once Agent G's contract files are the merge base (would
live entirely inside `src/lib/cashier/store.ts`, no change needed to `demo-store.ts`).

## Running the tests

```bash
npm test                                          # full repo suite (see note on flakiness below)
npx tsx --test tests/api/cashier-settle.test.ts   # this agent's tests only
```

Both commands run from the worktree root. No extra env vars are required — the test file sets
`DEMO_MODE=true` and deletes Supabase/Moniepoint/Paystack keys so every provider runs in simulate
mode (deterministic, no network calls).

### Coverage (`tests/api/cashier-settle.test.ts`, 9 tests)

1. Rejects requests without a valid `key`/`x-demo-key` (401).
2. Accepts the `x-demo-key` header form of auth.
3. Rejects an unknown `reservationId` (404).
4. **Cash settle happy path** — payment `success` immediately, reservation → `confirmed`.
5. **Idempotent replay** — same `clientMutationId` twice returns the same `paymentId`/`reference`
   and flags `idempotentReplay: true` on the second call (no duplicate payment created).
6. Moniepoint terminal settle — pending payment created, `GET .../status` syncs it to `success`
   and confirms the reservation (reuses `syncMoniepointPushPayment`).
7. Moniepoint transfer settle — same as above via the transfer push path.
8. Paystack Terminal settle — simulated pending payment (`demo: true`), promoted to `success` via
   the status endpoint's demo bypass.
9. Status endpoint 404s for an unknown reference.

Result: **9/9 passing** in isolation and as part of the full suite when run sequentially
(`--test-concurrency=1`).

## Known pre-existing issues (not introduced by this agent)

- `npm test` runs test files with **concurrency**, and several existing suites
  (`tests/api/reservation-flow.test.ts`, `tests/api/staff-reservation.test.ts`,
  `tests/api/cashier-settle.test.ts`, …) all read/write the same `data/demo-store.json` file via
  `src/lib/demo-store.ts` with a non-atomic read-modify-write. Under concurrency this occasionally
  clobbers another file's just-written record, causing sporadic, non-deterministic failures
  unrelated to any single suite's logic. Confirmed by running
  `npx tsx --test --test-concurrency=1 tests/unit/*.test.ts tests/api/*.test.ts`, which drops the
  flakiness entirely (52/53 pass — see next bullet for the one remaining failure). This predates
  this agent's change (verified via `git status`: `src/lib/demo-store.ts` is untouched) and is out
  of this agent's exclusive file scope to fix.
- `tests/unit/reservation-schema.test.ts` → `"accepts valid room reservation payload"` fails on a
  clean worktree with no cashier changes applied (`src/lib/schemas/reservation.ts` untouched by
  this agent). Not investigated further — outside this agent's scope.

## Manual curl smoke test

```bash
KEY=relief-demo-2026

# 1. Create a pending reservation (walk-in, no deposit)
curl -s "http://localhost:3002/api/demo/reservations?key=$KEY" \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@example.com","roomId":"guest-room","checkIn":"2026-09-10","checkOut":"2026-09-12","guests":2}'

# 2. Settle with cash
curl -s "http://localhost:3002/api/staff/cashier/settle?key=$KEY" \
  -H 'Content-Type: application/json' \
  -d '{"reservationId":"<id-from-step-1>","amountNgn":15000,"paymentMethod":"cash","clientMutationId":"<uuid>"}'

# 3. Settle with Paystack Terminal (simulate mode by default) then poll status
curl -s "http://localhost:3002/api/staff/cashier/settle?key=$KEY" \
  -H 'Content-Type: application/json' \
  -d '{"reservationId":"<id>","amountNgn":15000,"paymentMethod":"paystack_terminal","clientMutationId":"<uuid>"}'

curl -s "http://localhost:3002/api/staff/cashier/settle/status?key=$KEY&reference=<reference-from-above>&demo=1"
```
