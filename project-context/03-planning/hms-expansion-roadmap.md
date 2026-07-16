# HMS Expansion Roadmap (Post–Cashier ADR-005)

**Status:** ✅ Merged to `main` (2026-07-16) — Agents K→N  
**Business case:** `00-business-context/business-case.md` — convert stays, reduce missed ops, premium digital channel  
**Prior wave:** Cashier dual POS G→J ✅  
**This wave:** Light Hotel Management System surfaces on the staff portal — **shipped**

## Goal

Give Relief Hotels a **usable light HMS** on the existing Next.js staff portal:

1. **Phase 2 — Minibar / F&B** — post charges to a guest folio; pay via cashier providers  
2. **Phase 3 — Roles + Accounting** — front_desk / manager / accountant views; payments & folio ledger  
3. **Phase 4 — Calendar + booking completeness** — occupancy calendar ops polish; reservation/booking paths verified  
4. **Loyalty** — **backlog TODO only** (not built this wave)

## Agent map (conflict-free)

| Phase | Agent | Branch | Exclusive ownership |
|-------|-------|--------|---------------------|
| **K** F&B/Folio | K | `features/agent-k-hms-fnb` | `src/content/fnb-catalog.ts`, `src/lib/folio/**`, `src/app/api/staff/folio/**`, `src/features/fnb/**`, `src/app/[locale]/staff/fnb/**`, `docs/supabase/migration-009-folio.sql`, `messages` key `"fnb"` only |
| **L** Roles | L | `features/agent-l-hms-roles` | `src/lib/staff-roles.ts`, `src/features/staff-shell/**`, `src/app/[locale]/staff/layout.tsx`, `messages` key `"staffShell"` only |
| **M** Accounting | M | `features/agent-m-hms-accounting` | `src/lib/accounting/**`, `src/features/accounting/**`, `src/app/[locale]/staff/accounting/**`, `messages` key `"accounting"` only |
| **N** Calendar ops | N | `features/agent-n-hms-calendar` | `src/features/staff-calendar/**`, `src/app/[locale]/staff/calendar/**`, `messages` key `"staffCalendar"` only — **do not rewrite** `inventory-calendar-view.tsx`; wrap/import it |

**Merge order:** `K → L → M → N → main`

## Phase details

### Phase 2 / Agent K — Minibar & F&B folio

- Static catalog: drinks, snacks, laundry, misc (₦ prices)
- Tables/store: `folio_charges` (reservation_id, sku, qty, unit_price, status open|posted|paid|void)
- API: `GET/POST /api/staff/folio/charges`, `POST .../pay` (links to payment or cash settle)
- UI: `/staff/fnb` — pick reservation → add lines → post → pay
- Acceptance: charge minibar item to pending reservation; see line on folio; mark paid

### Phase 3 / Agent L — Role views

- Roles: `front_desk` | `manager` | `accountant` (query `?role=` + optional cookie; still key-gated)
- Shell nav: Dashboard, Cashier, F&B, Calendar, Accounting — filtered by role
- front_desk: bookings + cashier + fnb + calendar  
- manager: all + messages  
- accountant: accounting + payments ledger focus  
- Acceptance: switching role changes nav visibility

### Phase 3 / Agent M — Accounting

- Ledger view: payments + folio charges by date range
- Summary: cash / paystack / moniepoint totals
- Export CSV button (client-side)
- Acceptance: accountant role sees daily totals matching activity data

### Phase 4 / Agent N — Calendar surface

- Dedicated `/staff/calendar` page embedding existing inventory calendar
- Quick filters: room category, date range
- Acceptance: manager opens calendar without scrolling past inbox

### Loyalty (TODO only)

Recorded in `improvement-backlog.md` and `loyalty-todo.md` — **no implementation**.

## Out of scope

- Full PMS / multi-property  
- Real auth (Clerk) — still `DEMO_DASHBOARD_KEY`  
- SMS/WhatsApp (ADR-003)  
- CMS for marketing copy  

## Deploy

Merge to `main` triggers Netlify. Apply `migration-009-folio.sql` in Supabase when live.
