# Staff portal test guide — Phases 0–3 (Agents O, Q, P, R, S)

Manual + automated test steps for everything shipped on `features/agent-s-paystack-reconcile` (PR #19):

| Phase | Agent | Feature |
|-------|-------|---------|
| 0 | O | Real staff identity & RBAC (login, session, role gates) |
| 1a | Q | Room blocks on the staff calendar |
| 1b | P | Housekeeping dashboard + checkout hand-off |
| 2 | R | F&B Nigerian VAT model |
| 3 | S | Paystack reconciliation for accounting |

All five build on the existing `?key=relief-demo-2026` (`DEMO_DASHBOARD_KEY`) staff portal. Phase 0 adds a **second**, opt-in auth mode (real login) that phases out the shared key. Test both modes — most installs today are still in legacy mode.

---

## 0. Setup

```bash
npm install
cp .env.example .env.local
```

Minimum for local QA (`.env.local`):

```env
PORT=3002
NEXT_PUBLIC_APP_URL=http://localhost:3002
DEMO_MODE=true
DEMO_DASHBOARD_KEY=relief-demo-2026
```

```bash
npm run dev
```

App runs at `http://localhost:3002`. All staff pages are under `/en/staff/...` (or `/fr/...` — this repo is i18n-routed).

### Automated tests first

```bash
npm test
```

Runs `scripts/run-unit-tests.mjs` — serially, to avoid file-store races (`data/*.json` is the local backing store). Confirm these all pass before manual QA; they cover every phase below:

- `tests/unit/staff-roles.test.ts`, `staff-accounts.test.ts`, `staff-session.test.ts`, `staff-auth-guard.test.ts` — Phase 0
- `tests/api/staff-auth.test.ts` — Phase 0 login/logout/me flow
- `tests/unit/inventory-calendar.test.ts`, `inventory-store-blocks.test.ts` — Phase 1a
- `tests/api/staff-checkout.test.ts` — Phase 1b
- `tests/unit/folio-tax.test.ts` — Phase 2
- `tests/api/staff-tax-settings.test.ts` — Phase 2
- `tests/unit/paystack-reconcile.test.ts` — Phase 3
- `tests/api/staff-reconcile.test.ts` — Phase 3

If a suite fails, fix before doing manual QA — the manual steps below assume green tests.

---

## Phase 0 (Agent O) — Real staff identity & RBAC

Two modes, gated by `STAFF_AUTH_ENABLED`:

- **Legacy mode** (`STAFF_AUTH_ENABLED=false`, the default) — any holder of `DEMO_DASHBOARD_KEY` reaches every `/api/staff/*` route, role-blind. A `role` dropdown in the staff shell only changes which nav items *render*; it enforces nothing server-side.
- **Real auth mode** (`STAFF_AUTH_ENABLED=true` + `STAFF_SESSION_SECRET` set) — name + PIN login, a signed session cookie, and server-side role enforcement via `requireStaffAccess()` on every route.

### A — Legacy mode (default, no env changes)

1. Visit `http://localhost:3002/en/staff?key=relief-demo-2026`.
2. Confirm the top nav shows a **Role** dropdown (Cashier / Manager / Restaurant Owner / Cleaner Head) instead of a "logged in as" pill.
3. Switch roles in the dropdown and confirm nav items change:
   - `cashier` → Dashboard, Cashier, F&B, Calendar
   - `manager` → adds Housekeeping (marked "read only"), Accounting, Tax Settings
   - `restaurant_owner` → Dashboard, F&B, Tax Settings only
   - `cleaner_head` → Dashboard, Housekeeping, Calendar (read only)
4. This is nav-only — confirm the API still lets any role through regardless: with the dropdown on `cashier`, open `http://localhost:3002/en/staff/housekeeping?key=relief-demo-2026` directly by URL. The page loads (legacy mode has no server role check).

### B — Real auth mode

1. Stop the dev server. Add to `.env.local`:
   ```env
   STAFF_AUTH_ENABLED=true
   STAFF_SESSION_SECRET=a-long-random-dev-secret-change-me
   ```
2. Restart `npm run dev`. Since `DEMO_MODE=true`, four demo accounts auto-seed into `data/staff-accounts.json` on first read:

   | Name | PIN | Role |
   |------|-----|------|
   | Cashier Demo | `1111` | cashier |
   | Manager Demo | `2222` | manager |
   | Restaurant Owner Demo | `3333` | restaurant_owner |
   | Cleaner Head Demo | `4444` | cleaner_head |

3. Visit `http://localhost:3002/en/staff` (no `?key` needed now). You should be redirected to `/en/staff/login`.
4. Log in as **Cashier Demo** / `1111`. Confirm:
   - Redirect to `/en/staff`.
   - Top-right shows "Logged in as Cashier Demo (Cashier)" and a **Log out** button — no role dropdown.
   - Nav shows only Dashboard, Cashier, F&B, Calendar (matches the cashier row of the access matrix).
5. Try a wrong PIN — confirm the form shows an invalid-credentials error and does not log in.
6. While logged in as Cashier, manually navigate to `http://localhost:3002/en/staff/accounting`. The page frame loads (nav-hidden pages aren't blocked at the router level) but any data fetch against `/api/staff/accounting/*` must 403 — check the Network tab or browser console for a 403 JSON body `{"error":"Forbidden — your role cannot access this"}`.
7. Click **Log out** → confirm redirect to `/en/staff/login` and that reloading `/en/staff` bounces you back to login (session cookie cleared).
8. Log in as **Manager Demo** / `2222`. Confirm nav now includes Housekeeping (read-only badge), Accounting, and Tax Settings, and that Accounting now loads data instead of 403ing.
9. Curl-level check that the server enforces this independent of the UI:
   ```bash
   # No cookie -> 401
   curl -i http://localhost:3002/api/staff/settings/tax

   # Cashier cookie -> GET 200 (read allowed for any role), PATCH 403 (write is manager/restaurant_owner only)
   curl -i -c /tmp/cashier.jar -X POST http://localhost:3002/api/staff/auth/login \
     -H 'Content-Type: application/json' -d '{"name":"Cashier Demo","pin":"1111"}'
   curl -i -b /tmp/cashier.jar -X PATCH http://localhost:3002/api/staff/settings/tax \
     -H 'Content-Type: application/json' -d '{"vatPercentage":10}'
   ```

---

## Phase 1a (Agent Q) — Room blocks on the staff calendar

Room blocks (housekeeping/maintenance holds) now render on `/staff/calendar` alongside reservations, so front desk can't accidentally sell a blocked room.

1. Go to `http://localhost:3002/en/staff/calendar?key=relief-demo-2026` (or logged in as manager/cleaner_head in real-auth mode).
2. If no blocks exist yet, create one from the Housekeeping page first (see Phase 1b, step 2) — e.g. block "Standard Room" for the next 2 days as `maintenance`.
3. Refresh the calendar and confirm the blocked room/date range renders distinctly from confirmed/pending reservations (separate visual treatment, not a fake guest booking).
4. Confirm you **cannot** create a new walk-in reservation for that room on a blocked date — attempt a booking from the calendar cell for the blocked room+date and confirm it's rejected or the cell is shown as unavailable.
5. As `cleaner_head`, confirm the calendar is reachable but read-only (per the access matrix — `"calendar": "read"`); as `cashier`/`manager` it should be fully interactive.

Automated coverage: `tests/unit/inventory-calendar.test.ts`, `tests/unit/inventory-store-blocks.test.ts` — run individually if you want to isolate this phase:

```bash
node --import tsx --test tests/unit/inventory-calendar.test.ts tests/unit/inventory-store-blocks.test.ts
```

---

## Phase 1b (Agent P) — Housekeeping dashboard + checkout hand-off

New `/staff/housekeeping` page: cleaner_head creates/clears room blocks; manager has read-only visibility. A confirmed reservation checkout now hands off to housekeeping automatically.

### A — Housekeeping dashboard

1. Go to `http://localhost:3002/en/staff/housekeeping?key=relief-demo-2026`.
2. Fill the form: pick a room, block type **Housekeeping**, a "blocked from" / "free from" date range, optional reason → **Submit**.
3. Confirm the new block appears in the list below, sorted by check-in date, with a status pill matching its type (housekeeping vs. maintenance get different badge colors).
4. Click **Mark clean** on the block → confirm it disappears from the list (block cleared / room released back to inventory).
5. Repeat as **Manager** (real-auth mode) — confirm the form is hidden or disabled (manager access level is `"read"` for `/staff/housekeeping` per the matrix) while the list still renders.
6. As **Cashier** or **Restaurant Owner**, confirm `/staff/housekeeping` is not reachable at all (not in nav; API calls 403 if forced).

### B — Checkout hand-off

1. Create (or find) a **confirmed** reservation — e.g. via the staff calendar walk-in flow or `/api/demo/reservations`.
2. Open it in the staff inbox/calendar detail sheet and click **Check out**. Confirm the browser confirm dialog appears; accept it.
3. Confirm the reservation status flips to `checked_out`.
4. Go to `/staff/housekeeping` and confirm a **new block automatically appears** for that room covering (at least) the just-vacated date — this is the hand-off: checkout creates a housekeeping block so the room can't be re-sold before cleaning.
5. Negative case: attempt checkout on a **pending** (not yet confirmed) reservation — confirm it's rejected (checkout is only valid from `confirmed`).

Automated coverage:

```bash
node --import tsx --test tests/api/staff-checkout.test.ts
```

---

## Phase 2 (Agent R) — F&B Nigerian VAT model

Owner-editable VAT (`/staff/settings/tax`) applied to F&B folio charges (`/staff/fnb`). Default: 7.5% VAT, `pass_through` mode.

### A — Tax settings

1. Go to `http://localhost:3002/en/staff/settings/tax?key=relief-demo-2026`.
2. Confirm the form loads with **VAT % = 7.5** and mode = **Pass-through** (itemized on top of guest's bill) pre-selected, with a second option **Absorbed** (already folded into the displayed price).
3. Change VAT to `10`, keep pass-through, **Save**. Confirm a "saved" confirmation appears and the value persists across a page refresh.
4. Switch mode to **Absorbed**, save, refresh — confirm it persists.
5. Reset back to `7.5` / pass-through for the rest of this run (so downstream numbers below match).
6. RBAC check: as **Cashier**, this page/route should reject writes (only manager + restaurant_owner can change tax settings per `tests/api/staff-tax-settings.test.ts`) — reads succeed for any role, writes 403.

### B — Folio charges with VAT (pass-through)

1. With VAT settings at `7.5%` / pass-through, go to `/staff/fnb?key=relief-demo-2026`, open a reservation's folio.
2. Add a charge: qty `2`, unit price ₦1,000 (e.g. "Bottled Water").
3. Confirm the folio list shows, at the bottom summary:
   - **Subtotal**: ₦2,000
   - **VAT (7.5%)**: ₦150
   - **Open balance (incl. VAT)**: ₦2,150
4. Mark the charge **Posted**, then **Paid** — confirm totals stay consistent and the paid charge no longer counts toward the open balance.

### C — Absorbed mode

1. Switch tax settings to **Absorbed**, `7.5%`.
2. Add a charge priced at ₦2,150 (tax-inclusive display price), qty 1.
3. Confirm the folio shows: **Subtotal ≈ ₦2,000**, **VAT ≈ ₦150**, but the **charged total stays ₦2,150** (absorbed mode never changes what the guest is billed — VAT is backed out of the sticker price for accounting purposes only).
4. Try VAT = `0` — confirm tax line shows ₦0 and total equals subtotal in both modes.

Automated coverage:

```bash
node --import tsx --test tests/unit/folio-tax.test.ts tests/api/staff-tax-settings.test.ts
```

---

## Phase 3 (Agent S) — Paystack reconciliation for accounting

Manager-only, read-only diff between Relief's own payment records and Paystack's own transaction list for a date range. **Never auto-corrects** — it only ever reports discrepancies.

### A — Demo mode (no live Paystack keys — this is the default local setup)

1. Go to `/staff/accounting?key=relief-demo-2026` (or logged in as **Manager**).
2. Pick any date range in the date filter.
3. Click **Run reconciliation** in the new panel above the ledger table.
4. Confirm it completes immediately and shows the "demo mode" notice rather than attempting a real Paystack call — this is expected whenever `DEMO_MODE=true` or Paystack keys are absent/invalid (`config.demoMode` short-circuits `reconcilePaystackTransactions` to an empty, non-erroring result).

### B — Live mode (requires real Paystack **test** keys)

1. In `.env.local`, set real test keys and turn off demo mode:
   ```env
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
   PAYSTACK_SECRET_KEY=sk_test_...
   # DEMO_MODE must be unset/false
   ```
2. Restart the dev server. Create at least one real Paystack test payment first (see `docs/testing/paystack-test-booking.md` for the guest checkout flow with test card `4084084084084081`) so there's something to reconcile.
3. Go to `/staff/accounting`, pick a date range covering that payment, click **Run reconciliation**.
4. Confirm the panel shows a summary line ("checked N local, M Paystack, K discrepancies found") and either **"No discrepancies"** or a list of discrepancy rows, each tagged with one of:
   - `amount_mismatch` — local and Paystack amounts differ for the same reference
   - `status_mismatch` — local says success but Paystack doesn't (or vice versa)
   - `missing_on_paystack` — Relief has a successful payment Paystack has no record of
   - `missing_locally` — Paystack shows a successful transaction with no matching local record
5. To manufacture a discrepancy for QA, edit a local payment record's status/amount directly in `data/*.json` (or via test fixtures) without touching Paystack, then re-run reconciliation and confirm it surfaces as expected — and confirm the underlying record is **not** modified by the reconciliation run itself (it only ever reads).

### C — Access control

1. As **Cashier** or **Restaurant Owner**, confirm `/api/staff/accounting/reconcile` returns 403 (`requireStaffAccess(request, ["manager"])` — manager-only, stricter than the rest of `/staff/accounting`).
2. Bad input check:
   ```bash
   curl -i "http://localhost:3002/api/staff/accounting/reconcile?key=relief-demo-2026&from=bad&to=2026-08-13"
   # expect 400: "from and to are required as YYYY-MM-DD"

   curl -i "http://localhost:3002/api/staff/accounting/reconcile?key=relief-demo-2026&from=2026-08-13&to=2026-08-01"
   # expect 400: "to must be on or after from"
   ```

Automated coverage:

```bash
node --import tsx --test tests/unit/paystack-reconcile.test.ts tests/api/staff-reconcile.test.ts
```

---

## Regression sweep

After all five phases, re-run the full suite once more to confirm nothing was left in a bad state from manual poking:

```bash
npm test
```

Then flip `STAFF_AUTH_ENABLED` back to `false` (or remove it) in `.env.local` if you don't intend to keep testing real-auth mode locally, since legacy mode is still what's live in production until staff accounts are seeded there.
