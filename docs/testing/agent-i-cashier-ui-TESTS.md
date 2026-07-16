# Test handoff — Agent I (Staff Cashier UI)

**Branch:** `features/agent-i-cashier-ui`
**ADR:** `project-context/02-architecture/architecture-decision-records/ADR-005-cashier-dual-pos.md`
**Contract:** `docs/contracts/api-v1.md` (Staff cashier settle, ADR-005)
**Merge order:** G → H → **I** → J (see `cashier-module-plan.md`)

## Scope delivered

- `src/features/cashier/**` — client-only cashier UI (types, fetch client, hooks, components)
- `src/app/[locale]/staff/cashier/page.tsx` — key-gated staff cashier page
- `messages/en.json` — new top-level `"cashier"` namespace (fr/pcm inherit via `en` fallback in `src/i18n/request.ts`)
- `src/app/[locale]/staff/page.tsx` — added a small "Cashier →" link (forwards `?key=`) above the existing `DemoDashboard`; `DemoDashboard` itself was **not** modified
- Written against the contract only — `src/lib/cashier/**`, `src/app/api/**`, and `src/lib/cashier-offline/**` were not touched, since those are Agents G/H/J's exclusive paths

## UX flow

1. `/[locale]/staff/cashier?key=…` — key resolved from `?key=`, else `sessionStorage["demo-dashboard-key"]` (shared with the demo dashboard), else the demo default. A key form (matching the demo dashboard's password-input + "Load queue" pattern) is always shown so staff can correct/re-enter it.
2. On load, `GET /api/demo/activity?key=` populates the queue; reservations are shown when `status === "pending"` OR there is no linked payment with `status === "success"`.
3. Selecting a reservation shows guest name/email/phone, check-in/check-out, nights, and a suggested amount (room nightly rate × nights, when the reservation's `roomId` matches the room catalog) — editable.
4. Four payment method buttons: Cash, Paystack Terminal, Moniepoint Terminal, Moniepoint Transfer.
5. Submit calls `POST /api/staff/cashier/settle` with a fresh `crypto.randomUUID()` as `clientMutationId`.
6. If the response `status` is `"pending"`, the UI polls `GET /api/staff/cashier/settle/status?reference=&key=` every 2.5s (up to ~1 minute) until `success`/`failed`.
7. Any `404` from the three endpoints is shown as **"Cashier API not deployed yet"** instead of a generic error, so the UI still compiles/runs against branches where Agent H's routes aren't merged yet.

## Automated checks

- [x] `npx tsc --noEmit` — PASS (only pre-existing, unrelated errors in `tests/e2e/prototype-session.spec.ts`)
- [ ] `npm run lint` — baseline already has pre-existing `react-hooks/set-state-in-effect` errors in `src/components/demo-dashboard.tsx`, `src/hooks/use-booking-search.ts`, etc. New cashier files follow the same "resolve key/props in a `useEffect`" pattern as `demo-dashboard.tsx` for UI parity, so they trip the same rule (3 instances). No new *other* lint errors introduced.
- [ ] `npm run build` — not run in this workspace (no local `node_modules`; typecheck was run against the monorepo root's installed deps via a temporary symlink, which was removed afterward)

### Commands run

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint src/features/cashier src/app/[locale]/staff/page.tsx src/app/[locale]/staff/cashier/page.tsx
```

## Manual QA

### Preconditions

```env
DEMO_DASHBOARD_KEY=relief-demo-2026   # or your configured value
```

1. `npm run dev`, open `/en/staff/cashier?key=relief-demo-2026`.
2. **Missing/invalid key:** remove `?key=` or enter a wrong key in the form — expect the "Invalid cashier key." message (once `/api/staff/cashier/settle*` / `/api/demo/activity` are live) and no reservation list.
3. **Queue loads:** with a valid key, the pending/unpaid reservations render as cards (guest name, status badge, dates).
4. **Empty queue:** if every reservation has a successful payment, expect the "No pending or unpaid reservations" empty state.
5. **Select → settle panel:** clicking a card shows guest details, dates/nights, a suggested amount (when `roomId` matches the catalog), the 4 payment method buttons, and a note field.
6. **Validation:** submit with no amount or no method selected — expect inline validation errors, no network call.
7. **Cash settle:** choose Cash + amount, submit — expect immediate `success` (per contract, cash should not require polling) and the confirmation panel with the reference.
8. **Terminal settle (pending → poll):** choose Paystack/Moniepoint Terminal, submit — expect the "Waiting for terminal confirmation…" state, polling `settle/status` until `success` or `failed`.
9. **Route not deployed:** on a branch/environment where `/api/staff/cashier/settle` 404s, expect the "Cashier API not deployed yet" message instead of a generic error, and the page must still render/compile.
10. **Nav link:** from `/en/staff?key=…`, confirm the "Cashier →" link navigates to `/en/staff/cashier` and forwards the `key` query param; confirm the existing dashboard below it is unaffected.
11. **i18n:** switch to `/fr/staff/cashier` — labels should fall back to the English `cashier` strings (fr/pcm messages inherit via `deepMerge` in `src/i18n/request.ts`); page must not crash on a missing key.

## Known limitations / follow-ups

- Suggested amount is a best-effort estimate from the public room catalog (`priceFrom × nights`); it is always editable and never blocks settlement.
- Offline/outbox queuing for cash settlements (IndexedDB) is Agent J's scope (`src/lib/cashier-offline/**`), not implemented here.
- Actual settle/status route behavior depends on Agent H's `src/app/api/staff/cashier/**` implementation landing per the documented contract.

## Sign-off

- [ ] Agent: automated checks passed (typecheck clean; lint parity with existing codebase noted above)
- [ ] QA: manual flow verified once Agent H's routes are merged
- [ ] Ready to merge (after G, H; before/alongside J per cashier-module-plan.md)
