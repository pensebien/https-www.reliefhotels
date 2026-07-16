# Test handoff — Agent J (Cashier Offline Outbox)

**ADR:** [ADR-005](../../project-context/02-architecture/architecture-decision-records/ADR-005-cashier-dual-pos.md) — Phase J
**Plan:** `project-context/03-planning/cashier-module-plan.md`
**Branch:** `features/agent-j-cashier-offline`
**Owns exclusively:** `src/lib/cashier-offline/**`, this doc, `tests/unit/cashier-offline.test.ts`

## Scope delivered

An IndexedDB-backed offline outbox for cashier `settle` payments, so a front-desk cashier can capture **cash** payments while offline and have them sync automatically once the connection returns. Reference pattern: CravinsOS (`~/projects/cravinsos/src/lib/offline/*`) — outbox + idempotent flush, adapted for a single queue (`settle_outbox`) instead of CravinsOS's multi-type outbox.

No application wiring is included — this is a library only. UI wiring (reservation picker, amount entry, "X pending" badge, manual retry button) is **Agent I's** later merge; the settle route itself is **Agent H's** (`POST /api/staff/cashier/settle`, per `docs/contracts/api-v1.md`).

### Files

| File | Purpose |
|------|---------|
| `types.ts` | `OutboxItem`, `CashierPaymentMethod`, DB/store name constants |
| `storage.ts` | Opens `relief-cashier-offline` (v1) IndexedDB DB, `settle_outbox` store; falls back to an in-memory `Map` when `indexedDB` is unavailable (SSR, Node, older browsers) |
| `outbox.ts` | `enqueueSettle`, `listPending`, `listAll`, `listFailed`, `markSynced`, `markFailed`, `markAttempted`, `removeItem` |
| `syncEngine.ts` | `flushOutbox(fetchImpl, options)` — POSTs each pending item to the settle endpoint |
| `network.ts` | `isOnline()`, `subscribeOnline(cb)`, `subscribeOffline(cb)` |
| `index.ts` | Public barrel — import from `@/lib/cashier-offline` only |

### Public API summary

```ts
import {
  enqueueSettle,      // (input, { allowNonCash? }) => Promise<OutboxItem>
  listPending,         // () => Promise<OutboxItem[]>
  listAll,
  listFailed,
  getById,
  markSynced,
  markFailed,
  markAttempted,
  removeItem,
  flushOutbox,         // (fetchImpl, { endpoint?, key?, keyHeader? }) => Promise<FlushOutboxResult>
  flushOutboxItem,
  retryOutboxItem,
  isOnline,
  subscribeOnline,
  subscribeOffline,
  OfflineOutboxError,
} from "@/lib/cashier-offline";
```

- **`enqueueSettle`** is idempotent on `clientMutationId` (generated if omitted) — re-enqueueing the same mutation after a reload updates the existing pending row instead of duplicating it. Only `paymentMethod: "cash"` is accepted for offline enqueue by default; queuing `paystack_terminal` / `moniepoint_terminal` / `moniepoint_transfer` requires `{ allowNonCash: true }` since those methods need a live provider handshake and can't reliably complete from a queued, unattended flush. This is a **documented policy choice**, not a hard technical limitation — Agent I's UI decides whether to ever pass that flag.
- **`flushOutbox`** POSTs each pending item's `{ reservationId, amountNgn, paymentMethod, clientMutationId, note }` to `POST /api/staff/cashier/settle` (default path; override via `options.endpoint`), sending `options.key` as the `x-demo-key` header (override via `options.keyHeader`) per the ADR-005 key gate. Outcomes:
  - HTTP 200 → `markSynced`
  - HTTP 409 → treated as **idempotent success** (already settled for this `clientMutationId`) → `markSynced`
  - Any other non-2xx response → `markFailed` with the server's `error` message when present
  - Thrown/network error (offline, DNS, abort) → item is left **pending** (`markAttempted`, attempts++) so the next flush retries it
- `fetchImpl` is always passed in explicitly (no implicit global `fetch`), so the caller controls runtime `fetch`/`AbortController` behavior and tests can stub it trivially.

## Automated checks

- [x] `npx tsx --test tests/unit/cashier-offline.test.ts` — **PASS** (12/12)
- [x] `npx tsc --noEmit` — no new errors introduced (2 pre-existing, unrelated errors in `tests/e2e/prototype-session.spec.ts`)
- [x] No lint errors in `src/lib/cashier-offline/**` or the new test file

### Commands run

```bash
npx tsx --test tests/unit/cashier-offline.test.ts
npx tsc --noEmit
npm test   # full unit + api suite — confirms no regressions outside this package
```

### Test coverage (`tests/unit/cashier-offline.test.ts`)

Runs under plain Node via `tsx --test` (no jsdom/browser) — `indexedDB` is `undefined` in this environment, so every test exercises the **in-memory fallback** path in `storage.ts`. The test file asserts `typeof indexedDB === "undefined"` up front to make that explicit and catch environment drift.

| Group | Cases |
|-------|-------|
| `enqueueSettle` | queues cash as pending; generates `clientMutationId` when omitted; idempotent re-enqueue (no duplicate row); rejects non-cash without `allowNonCash`; accepts non-cash with `allowNonCash: true`; rejects non-positive `amountNgn` |
| `markSynced` / `markFailed` | synced item leaves `listPending()`; failed item increments `attempts` and records `lastError` |
| `flushOutbox` | 200 → synced; 409 → synced (idempotent); network error → left pending with incremented `attempts`; non-409 error response → failed with server error message; each pending item flushed exactly once, synced items untouched on next flush |

## Manual QA (once Agent H + Agent I are merged)

Preconditions: `CASHIER_ENABLED=true`, a seeded pending reservation, staff portal session.

1. Go offline (DevTools → Network → Offline).
2. Settle a reservation with cash in the cashier UI.
3. Confirm the item appears in the "pending sync" state (Agent I UI) and `settle_outbox` (IndexedDB, Application tab) has one `pending` row.
4. Go back online.
5. Confirm the outbox flushes automatically (or via manual "Sync now"): reservation status → `confirmed`, exactly **one** payment row created (no duplicate from retried flushes), outbox row → `synced`.
6. Repeat step 2–5 while simulating a flaky connection (throttle + a few dropped requests) — confirm no duplicate payment rows are created (idempotency via `clientMutationId`).

**Pass:** offline cash → reconnect → exactly one payment row + reservation confirmed (per Phase J acceptance criteria in `cashier-module-plan.md`).

## Blockers / follow-ups

- None from this package. Depends on Agent H's `POST /api/staff/cashier/settle` existing at the documented path/shape and Agent I wiring `flushOutbox`/`subscribeOnline` into the cashier UI.
- Non-cash offline queuing (`allowNonCash: true`) is deliberately opt-in and unexercised by any UI yet — flag for Agent I if a "queue terminal payment for later" flow is ever desired; recommend keeping it cash-only for the initial launch.

## Sign-off

- [x] Agent: automated checks passed
- [ ] QA: manual offline→online flow verified end-to-end (post Agent H/I merge)
- [ ] Ready to merge (merge **last**, after G → H → I, per `cashier-module-plan.md`)
