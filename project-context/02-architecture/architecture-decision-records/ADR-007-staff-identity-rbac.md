# ADR-007: Real staff identity & RBAC (Agent O)

**Date:** 2026-08-12
**Status:** Accepted
**Deciders:** Tech Lead
**Traces to:** `03-planning/task-breakdown.md` (Agent L — role views), `hms-expansion-roadmap.md`

## Context

**Phase 0 requirement:** none directly — this is Wave 2 of the in-house HMS, continuing past the merged cashier (G–J) and HMS (K–N) waves.

**Gap found:** Agent L's role views (`src/lib/staff-roles.ts`) only ever filtered which nav links render client-side, keyed off a `?role=` query param a staff member sets themselves via a `<select>` in `StaffShell`. Every `/api/staff/*` route (and staff-only `/api/demo/*` routes) still gated on one shared `DEMO_DASHBOARD_KEY` env var, checked in each route individually. In practice: anyone holding that one key could add `?role=manager` to any URL and see accounting, regardless of their actual job. "Different roles" was cosmetic, not access control.

The new HMS wave adds real operational roles — cashier, manager, restaurant_owner, cleaner_head — each of which should only reach their own area (a cleaner shouldn't see the accounting ledger; a restaurant owner shouldn't settle room payments). That requires real per-staff identity, not a bigger nav-filter matrix.

## Decision

1. Add a `staff_accounts` store (`src/lib/staff-accounts.ts`) — name + role + PIN (scrypt-hashed), same dual file/Supabase pattern as every other store in this codebase (`docs/supabase/migration-010-staff-accounts.sql`).
2. **PIN-based login**, not email/password — matches how a shared front-desk/cashier tablet actually gets used, and needs no email provider. `POST /api/staff/auth/login` verifies name+PIN and sets a signed, httpOnly cookie (`src/lib/staff-session.ts`, hand-rolled HMAC — no new auth vendor, consistent with the project's earlier rejection of Clerk on cost/scope grounds in `technology-decisions.md`).
3. `src/lib/staff-roles.ts` role set becomes `cashier | manager | restaurant_owner | cleaner_head` (was `front_desk | manager | accountant` — manager absorbs the old accountant view; front-desk duties fold into cashier).
4. New `requireStaffAccess(request, allowedRoles?)` (`src/lib/staff-auth-guard.ts`) is the actual enforcement point, called at the top of every `/api/staff/*` and staff-only `/api/demo/*` route — replacing each route's individual `isValidDashboardKey()` check.
5. **Feature-flagged rollout:** `STAFF_AUTH_ENABLED=false` (default) makes `requireStaffAccess` behave exactly like the old per-route check — any valid `DEMO_DASHBOARD_KEY` grants access, role-blind. Nothing breaks before accounts are seeded. Once `STAFF_AUTH_ENABLED=true` (and `STAFF_SESSION_SECRET` set), it switches to real session+role enforcement.
6. `StaffShell` detects which mode is live via `GET /api/staff/auth/me` and swaps UI accordingly: legacy mode keeps the existing role `<select>` + `?key=`/`?role=` query params unchanged; real mode shows "Signed in as {name} ({role})" + logout, and redirects unauthenticated visitors to a new `/staff/login` page.

## Options considered

| Option | Pros | Cons | Result |
|--------|------|------|--------|
| Adopt Clerk/NextAuth | Batteries-included, less code to maintain | Cost + scope already rejected once for this budget (`technology-decisions.md`); overkill for ~4–10 named staff | Rejected |
| Bigger nav matrix, no server enforcement | Zero backend work | Doesn't fix the actual hole — client-declared role was the whole problem | Rejected |
| Hand-rolled PIN + signed cookie (this ADR) | No new vendor, fits existing plain-crypto style, matches shared-tablet usage | We own the (small) auth code | **Accepted** |

## Consequences

**Positive:** role access is enforced server-side for the first time; rollout is safe (flagged, reversible) instead of a hard cutover; existing UI keeps working unchanged until the flag flips.
**Negative:** the client-side `?key=`/`?role=` query params sprinkled through staff components become dead weight once auth is enabled (harmless — cookies win — but not cleaned up in this phase; a fast-follow can remove them once the flag is permanently on).
**Mitigation:** none needed beyond the flag itself; rollback is instant.

## Success criteria

- Each of the 4 demo accounts (seeded automatically in file-store + `DEMO_MODE=true`) can log in and reach exactly the routes/nav items their role permits per `ACCESS_MATRIX`.
- A cashier session hitting `/api/staff/folio/charges` with `role: "cleaner_head"`-only intent is rejected with 403 (a real server-side check now exists to test).
- Legacy mode (`STAFF_AUTH_ENABLED=false`) behaves identically to before this change — verified by the existing test suite staying green.

## Rollback

Set `STAFF_AUTH_ENABLED=false` — every route falls back to the shared-key check immediately, no data migration needed.
