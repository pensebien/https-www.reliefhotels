# Test handoff — Agent K (HMS F&B / Minibar Folio)

**Branch:** `features/agent-k-hms-fnb`
**Owns exclusively:**

- `src/content/fnb-catalog.ts`
- `src/lib/folio/**`
- `src/app/api/staff/folio/**`
- `src/features/fnb/**`
- `src/app/[locale]/staff/fnb/**`
- `docs/supabase/migration-009-folio.sql`
- this doc
- `messages/en.json` — top-level `"fnb"` key only
- `tests/api/folio-charges.test.ts`, `tests/unit/folio-catalog.test.ts`

## Scope delivered

A staff-facing minibar / F&B / laundry / misc "folio" module so front desk / room service can post incidental guest charges against a reservation and track them through to settlement, independent of the cashier's payment-settlement flow (ADR-005 scope).

### Catalog (`src/content/fnb-catalog.ts`)

12 items across 4 categories (`minibar`, `snacks`, `laundry`, `misc`), each with `id` (sku), `name`, `category`, `priceNgn`. `findFnbCatalogItem(sku)` and `fnbCatalogByCategory()` helpers.

### Folio store (`src/lib/folio/**`)

- `types.ts` — `FolioCharge` (`id`, `reservationId`, `sku`, `name`, `qty`, `unitPriceNgn`, `status`, `createdAt`, `paidAt?`), `FolioChargeStatus` = `open | posted | paid | void`, `isTerminalFolioStatus`.
- `schemas.ts` — Zod schemas for create (`reservationId`, `sku`, `qty` default 1) and patch (`status: posted | paid | void`).
- `store.ts` — dual-mode, same pattern as `src/lib/db/inventory-store.ts`:
  - **File mode (default):** `data/folio-charges.json` (gitignored, like `demo-store.json` — regenerated on first read if missing).
  - **Supabase mode:** activates automatically once `isSupabaseEnabled()` is true, against the `folio_charges` table from `docs/supabase/migration-009-folio.sql`.
  - `addFolioCharge` snapshots `name`/`unitPriceNgn` from the catalog at charge-creation time (so later catalog/price edits don't retroactively change historical charges); throws `FolioStoreError(404)` for an unknown sku.
  - `updateFolioChargeStatus` enforces a one-way status lattice — `paid` and `void` are terminal; attempting to change a terminal charge throws `FolioStoreError(409)`. `paidAt` is stamped server-side when transitioning to `paid`.

### APIs (`src/app/api/staff/folio/**`)

Key-gated identically to the cashier module (`isValidDashboardKey` / `unauthorizedDashboardResponse` from `@/lib/dashboard-auth`; accepts `?key=` or `x-demo-key` header):

- `GET /api/staff/folio/charges?reservationId=&key=` — lists charges, optionally filtered by `reservationId`.
- `POST /api/staff/folio/charges { reservationId, sku, qty, key }` — creates an `open` charge.
- `PATCH /api/staff/folio/charges/[id] { status: posted|paid|void, key }` — transitions a charge.

### UI (`src/features/fnb/**`, `/[locale]/staff/fnb`)

Client-only feature module mirroring the cashier feature's structure (`components/`, `hooks/`, `lib/`, `types.ts`) — deliberately self-contained (no imports from `@/features/cashier/**`) so the two staff modules can evolve independently:

1. Staff key form (session-persisted, `?key=` URL param, same UX as cashier).
2. Reservation picker — loads from `GET /api/demo/activity` (existing, shared endpoint), shows all non-cancelled reservations.
3. Folio list for the selected reservation — status badges, "Mark posted" / "Mark paid" / "Void" actions, open balance + folio total.
4. Catalog browser grouped by category with a qty stepper + "Add" button per item.

Route: `/[locale]/staff/fnb` — `robots: noindex` (internal tool, matches `/staff/cashier`).

### i18n

Added a single top-level `"fnb"` namespace to `messages/en.json` (29 keys) — did not touch any other keys, including the existing `"cashier"` namespace.

## Automated checks

- [x] `npx tsx --test tests/unit/folio-catalog.test.ts tests/api/folio-charges.test.ts` — **PASS (17/17)**
- [x] `npx tsc --noEmit` — no new errors introduced (2 pre-existing, unrelated errors in `tests/e2e/prototype-session.spec.ts`)
- [x] `npx eslint` on all files in this agent's exclusive paths — clean (see note below on `react-hooks/set-state-in-effect`)
- [x] `npm run build` — compiles; `/[locale]/staff/fnb`, `/api/staff/folio/charges`, `/api/staff/folio/charges/[id]` all present in the route manifest
- [x] `npm test` (full suite) — 79/82 pass; the 3 failures (`Cashier settle API`, `Reservation API flow`, `reservationSchema`) are pre-existing and outside this agent's scope (untouched files)
- [x] Manual smoke test via a local `next start` server + browser: loaded `/en/staff/fnb?key=relief-demo-2026`, selected a reservation, added a minibar charge, confirmed it appeared as `open` with the correct NGN total, then verified `posted` → `paid` and `void` transitions via curl against the live routes

### Commands run

```bash
npx tsx --test tests/unit/folio-catalog.test.ts tests/api/folio-charges.test.ts
npx tsc --noEmit
npx eslint src/content/fnb-catalog.ts src/lib/folio src/app/api/staff/folio src/features/fnb "src/app/[locale]/staff/fnb" tests/unit/folio-catalog.test.ts tests/api/folio-charges.test.ts
npm run build
npm test
```

### Note: `react-hooks/set-state-in-effect`

This Next.js/eslint-config-next version flags `setState` calls inside `useEffect` bodies (including indirectly, via a called function) as errors. The cashier module's `useEffect`-based key-resolution and data-loading hooks use the identical pattern (reading `sessionStorage`/`searchParams` post-mount, then kicking off an async fetch on mount) — this is the standard "sync from an external/browser-only API on mount" case, not a real anti-pattern. Rather than restructure away from `useEffect` (which would risk hydration mismatches for `sessionStorage` reads), the 3 occurrences in `src/features/fnb/**` carry a targeted `eslint-disable-next-line react-hooks/set-state-in-effect` with a one-line justification comment. Flagging here in case a later cleanup pass wants to align the cashier module the same way.

### Test coverage

| File | Cases |
|------|-------|
| `tests/unit/folio-catalog.test.ts` | catalog has 12 items across all 4 categories; every item has a positive price + unique sku; `findFnbCatalogItem` hit/miss; `fnbCatalogByCategory` groups everything; `folioChargeTotalNgn` math; `isTerminalFolioStatus` |
| `tests/api/folio-charges.test.ts` | GET/POST reject a missing/invalid key (401); POST rejects an unknown sku (404); POST snapshots catalog name/price; `qty` defaults to 1; GET filters by `reservationId`; PATCH `open → posted → paid` (stamps `paidAt`); PATCH `open → void` directly; PATCH on a terminal charge is rejected (409); PATCH on an unknown id is rejected (404) |

## Manual QA

Preconditions: `DEMO_DASHBOARD_KEY` set (defaults to `relief-demo-2026`), dev/prod server running.

1. Open `/en/staff/fnb?key=relief-demo-2026`.
2. Pick any reservation from the list.
3. Add a couple of items from different categories (minibar, snacks, laundry, misc) with varying quantities — confirm each appears in "Folio charges" as `open` with the correct line total.
4. Mark one charge `posted`, then `paid` — confirm the "Open balance" total drops but "Folio total" stays the same, and the paid charge's actions disappear.
5. `Void` an `open` charge — confirm its actions disappear and it no longer counts toward "Open balance".
6. Reload the page and re-select the same reservation — confirm charges persisted (file store: `data/folio-charges.json`).
7. Try an invalid key — confirm the reservations list shows the "Invalid staff key" error instead of data.

**Pass:** charges post, transition, and total correctly; no cross-talk with the cashier queue/settle flow; no changes to any `DO NOT TOUCH` path.

## Blockers / follow-ups

- None. This module is fully self-contained and does not depend on any other in-flight agent's work beyond the pre-existing `GET /api/demo/activity` endpoint and `@/lib/dashboard-auth`.
- The Supabase path in `src/lib/folio/store.ts` / `migration-009-folio.sql` is untested against a live Supabase project (no `SUPABASE_URL` configured in this environment) — it follows `inventory-store.ts`'s exact pattern, but should get a smoke test whenever Supabase is wired up for this environment.

## Sign-off

- [x] Agent: automated checks passed
- [ ] QA: manual folio flow verified end-to-end
- [ ] Ready to merge
