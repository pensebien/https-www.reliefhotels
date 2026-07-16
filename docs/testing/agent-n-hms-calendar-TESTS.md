# Test handoff — Agent N (HMS Staff Calendar)

**Branch:** `features/agent-n-hms-calendar`

## Scope delivered

- `src/features/staff-calendar/**` — client-only feature module (types, fetch client, hook, key-gate form, main client component)
- `src/app/[locale]/staff/calendar/page.tsx` — key-gated, Suspense-wrapped staff occupancy calendar page
- `messages/en.json` — new top-level `"staffCalendar"` namespace (fr/pcm/ig/yo inherit via `en` fallback in `src/i18n/request.ts`)
- **Not modified (per instructions):** `src/components/staff/inventory-calendar-view.tsx` and `src/lib/inventory-calendar.ts` — both are imported and wrapped as-is. `src/app/[locale]/staff/page.tsx` and `src/components/demo-dashboard.tsx` were also left untouched (out of this agent's exclusive paths).

## UX flow

1. `/[locale]/staff/calendar?key=…` — key resolved from `?key=`, else `sessionStorage["demo-dashboard-key"]` (shared with the demo dashboard/cashier pages so staff don't have to re-enter it), else the demo default `relief-demo-2026`. A key form (matching the existing password-input + "Load calendar" pattern) is always shown so staff can correct/re-enter it.
2. On load, `GET /api/demo/activity?key=` populates `reservations`, `payments`, and `eventInquiries`, which are handed to the existing, unmodified `InventoryCalendarView` component (weekly grid, category filter chips, legend, pagination, and booking detail sheet are all its own built-in behavior — this satisfies the "optional category filter UI" requirement without duplicating it).
3. `401` renders "Invalid dashboard key."; other non-OK responses show the server's `error` message or a generic fallback.
4. Empty state (`no reservations and no event inquiries`) shows a dedicated "No reservations yet" card instead of an empty grid.
5. A "← Back to staff portal" link (forwarding `?key=`) sits above the header, and a "Refresh" button re-fetches once data has loaded once.
6. Portal styling is matched 1:1 with `src/app/[locale]/staff/cashier/page.tsx` / `CashierClient` (same container width, eyebrow/title/subtitle block, key form, refresh button, and error styling conventions).

## Automated checks

- [x] `npx tsc --noEmit -p tsconfig.json` — PASS (only pre-existing, unrelated errors in `tests/e2e/prototype-session.spec.ts`, not touched by this agent)
- [x] `npx next build` — PASS; `/[locale]/staff/calendar` appears in the route manifest alongside `/[locale]/staff` and `/[locale]/staff/cashier`
- [ ] `npx eslint src/features/staff-calendar src/app/[locale]/staff/calendar/page.tsx` — 2 pre-existing-pattern errors (`react-hooks/set-state-in-effect`) in `use-staff-calendar-activity.ts` and `staff-calendar-client.tsx`. This is the same "resolve key/props in a `useEffect`" pattern already used throughout the codebase (`src/components/demo-dashboard.tsx`, `src/features/cashier/hooks/use-cashier-queue.ts`, `src/features/cashier/components/cashier-client.tsx`, `cashier-settle-panel.tsx` — 6 instances total on baseline `main`). No *new* category of lint error introduced.

### Commands run

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint src/features/staff-calendar src/app/[locale]/staff/calendar/page.tsx
npx next build
```

Note: this workspace has no local `node_modules`/`.env.local`; both were symlinked from the monorepo root (`/Users/macbookpro/projects/reliefhotels`) to run the checks above, matching the approach used by Agent I. Remove the symlinks before a real CI run, or let CI install its own deps — do not commit them (already covered by `.gitignore`).

## Manual QA

### Preconditions

```env
DEMO_DASHBOARD_KEY=relief-demo-2026   # or your configured value
```

1. `npm run dev` (port 3002), open `/en/staff/calendar?key=relief-demo-2026`.
2. **Missing/invalid key:** remove `?key=` or enter a wrong key in the form — expect "Invalid dashboard key." and no calendar grid.
3. **Calendar loads:** with a valid key, the weekly occupancy grid renders (rooms + event spaces as rows, 7 days as columns), with the legend (Available/Occupied/Pending) and category filter chips above it.
4. **Empty state:** if there are zero reservations and zero event inquiries for the key, expect the "No reservations yet" card instead of the grid.
5. **Booking detail:** click an occupied/pending/inquiry cell — expect the existing `BookingDetailSheet` to open with guest name, dates, status, and deposit info.
6. **Category filter:** click a category chip (e.g. "Suites") — grid rows narrow to that category only; "All" restores every row. Week navigation (prev/next/"This week") still works while a filter is active.
7. **Refresh:** click "Refresh" — button spins briefly and re-fetches from `/api/demo/activity`.
8. **Back link:** click "← Back to staff portal" — navigates to `/en/staff`, forwarding `?key=` if present; confirm the existing staff dashboard is unaffected (this agent did not modify it).
9. **Key persistence:** load `/en/staff/calendar` with no `?key=` after previously unlocking `/en/staff` or `/en/staff/cashier` in the same browser session — the shared `sessionStorage["demo-dashboard-key"]` value should be picked up automatically.
10. **i18n:** switch to `/fr/staff/calendar` — labels fall back to the English `staffCalendar` strings (fr/pcm/ig/yo inherit via `deepMerge` in `src/i18n/request.ts`); page must not crash on a missing key.

## Known limitations / follow-ups

- No new pagination/filter UI was added at the page level — `InventoryCalendarView`'s built-in category filter chips and pagination already cover this, per instructions not to rewrite that component.
- This page reads the same `/api/demo/activity` endpoint as the rest of the staff portal; it does not introduce any new API routes or server-side logic.
- Room/event-space unit labels are built client-side from `@/content/site` (`rooms`) and `@/features/phase-2-product-expansion/content/event-spaces` (`eventSpaces`), mirroring the exact logic already in `src/components/demo-dashboard.tsx`.

## Sign-off

- [ ] Agent: automated checks passed (typecheck + build clean; lint parity with existing codebase noted above)
- [ ] QA: manual flow verified
- [ ] Ready to merge
