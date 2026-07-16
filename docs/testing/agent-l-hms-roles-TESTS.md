# Test handoff — Agent L (HMS Roles Shell)

**Branch:** `features/agent-l-hms-roles`
**Merge order:** independent of K (F&B) / M (Accounting) / N (Calendar) — nav links to their routes even before they merge (see "Known limitations" below).

## Scope delivered

- `src/lib/staff-roles.ts` — `StaffRole` type (`front_desk` | `manager` | `accountant`), `NAV_ITEMS`, and the `canAccess(role, href)` / `getAccessLevel(role, href)` matrix.
- `src/features/staff-shell/components/staff-shell.tsx` — client `StaffShell` component: role switcher + horizontal nav, both querystring-driven.
- `src/app/[locale]/staff/layout.tsx` — **new** nested layout for the `/staff` segment; wraps `children` with `<StaffShell>` (client boundary via import, layout itself stays a server component).
- `messages/en.json` — new top-level `"staffShell"` namespace only (fr/pcm/ig/yo inherit via the existing `deepMerge` fallback in `src/i18n/request.ts` — no other locale files touched).
- **Not touched:** `demo-dashboard.tsx`, cashier internals, folio, accounting feature folders, `inventory-calendar-view.tsx`, and no existing page files (`staff/page.tsx`, `staff/cashier/page.tsx`) were modified — they simply render as `children` inside the new layout now.

## How roles filter nav

`NAV_ITEMS` is a fixed, ordered list of `{ href, labelKey }` for all five staff routes (`/staff`, `/staff/cashier`, `/staff/fnb`, `/staff/calendar`, `/staff/accounting`). `StaffShell` calls `getAccessibleNavItems(role)` (from `staff-roles.ts`), which filters `NAV_ITEMS` down to hrefs present in that role's entry in `ACCESS_MATRIX`:

- **front_desk:** `/staff`, `/staff/cashier`, `/staff/fnb`, `/staff/calendar` (no Accounting link at all).
- **manager:** all five routes.
- **accountant:** `/staff`, `/staff/accounting`, and `/staff/calendar` — but `/staff/calendar` is recorded as `"read"` in the matrix (vs. `"full"` for everything else), so `StaffShell` renders it with a `(view only)` suffix. `canAccess()` only reports true/false reachability for guards; `getAccessLevel()` exposes the finer read/full distinction so a future calendar page can decide whether to disable mutations for that role.

The active role comes from the `?role=` query param (validated by `parseStaffRole`, default `front_desk` for missing/unknown values) — there's no auth/session lookup, this is a pure client-side nav filter per the task's URL-driven design. Every rendered nav link and the role-switcher's own navigation preserve both `?key=` and `?role=` (the latter omitted when it's the default, to keep URLs clean) so switching pages or roles never drops the cashier key.

## Automated checks

- [x] `npx tsc --noEmit -p tsconfig.json` — PASS (only pre-existing, unrelated errors in `tests/e2e/prototype-session.spec.ts`, same ones noted in Agent I's handoff).
- [x] `npx eslint src/lib/staff-roles.ts src/features/staff-shell "src/app/[locale]/staff/layout.tsx"` — clean, no errors/warnings.
- [x] `npx next build` — full production build succeeds; `/[locale]/staff` and `/[locale]/staff/cashier` compile and render through the new layout. (`node_modules` isn't checked into this workspace; verified via a temporary symlink to the monorepo root's `node_modules`, removed afterward — same approach as Agent I's handoff.)

## Manual QA

1. `npm run dev`, open `/en/staff?key=relief-demo-2026`.
2. **Default role:** with no `?role=` param, expect the nav bar to show Dashboard, Cashier, F&B, Calendar (no Accounting), and the role select to show "Front Desk" selected.
3. **Switch to Manager:** pick "Manager" in the select — URL gains `&role=manager`, nav now also shows Accounting.
4. **Switch to Accountant:** pick "Accountant" — nav collapses to Dashboard, Accounting, and Calendar; Calendar's link shows a small "(view only)" suffix.
5. **Key preserved:** in every role switch and nav click, confirm `?key=relief-demo-2026` (or whatever key was present) survives in the URL.
6. **Active link styling:** click "Cashier" — the Cashier pill should highlight (filled teal) while on `/staff/cashier`; other pills stay unfilled.
7. **Unbuilt routes:** click F&B / Calendar / Accounting before those agents' pages merge — expect a normal Next.js 404, since those routes have no `page.tsx` yet in this workspace. Once Agents K/M/N add their `page.tsx` files under `/staff/fnb`, `/staff/accounting`, `/staff/calendar`, this layout will automatically wrap them with no changes needed here.
8. **i18n:** switch to `/fr/staff` — nav/role labels fall back to the English `staffShell` strings (fr.json doesn't define this namespace); page must not crash on a missing key.
9. **Existing pages unaffected:** confirm `/en/staff` still shows the original "Cashier →" link and `DemoDashboard`, and `/en/staff/cashier` still shows the full cashier queue UI — both entirely unchanged, just now nested under the new shell chrome.

## Known limitations / follow-ups

- `/staff/fnb`, `/staff/calendar`, `/staff/accounting` are linked in the nav per the task spec, but will 404 until Agents K/M/N merge their respective `page.tsx` files — this is expected and requires no follow-up from this branch.
- Access control here is nav-visibility only (no server-side/session enforcement) — it does not gate the underlying `/staff/**` pages or `/api/staff/**` routes. If real role-based auth is needed later, it should be layered on top of (or read from) `src/lib/staff-roles.ts`'s exported types/matrix rather than duplicated.
- `getAccessLevel`'s `"read"` value is currently only used for the `(view only)` nav label; no calendar page exists yet in this workspace to actually enforce read-only behavior for the accountant role.

## Sign-off

- [ ] Agent: automated checks passed (typecheck clean; lint clean; build succeeds)
- [ ] QA: manual flow verified
- [ ] Ready to merge
