# RAYZA Connect — live sandbox re-check

| Date | Tester | Scope | Result |
|------|--------|-------|--------|
| 2026-09-20 | Tech Lead (Claude Code) | RAYZA Connect live sandbox, endpoint drift + push/cancel cycle | **PASS** |

## Why this check

Confirming the integration built in ADR-006 / verified in `2026-08-12-rayza-connect.md` still works — no code had changed since, but the sandbox is a third-party service that could drift independently. Ran with a fresh sandbox key provided directly for this check.

## What was tested

Unlike the Aug 12 report (which drove Relief's own route handlers in-process), this pass hit the live sandbox directly to isolate "does RAYZA's API still behave the way our client code assumes" from "does our app wire it correctly" (the latter is already covered by `tests/unit/rayza-connect.test.ts`, which also re-ran clean, 7/7).

| # | Check | Result |
|---|-------|--------|
| 1 | Unit tests (`node --test tests/unit/rayza-connect.test.ts`) | ✔ 7/7 pass |
| 2 | Sandbox reachable (`GET /openapi.json`) | ✔ `200` |
| 3 | Endpoint paths unchanged vs. what `src/lib/integrations/rayza-connect.ts` calls | ✔ `POST /v1/bookings`, `POST /v1/bookings/{reference}/cancel` both present, same shape |
| 4 | Push a booking (`POST /v1/bookings`) | ✔ `201` → `{"status":"received","id":"..."}` |
| 5 | Booking appears (`GET /v1/bookings`) | ✔ listed with correct `amount`, `room_identifier`, dates, `status: "pending"` |
| 6 | Cancel (`POST /v1/bookings/{reference}/cancel`) | ✔ `200` → `{"status":"cancelled"}` |
| 7 | Idempotent double-cancel | ✔ `404` "Booking reference not found" — matches `cancelReservationOnRayza`'s existing handling, which treats RAYZA 404 as success |

## Result

No drift, no code changes needed — the integration built for ADR-006 still holds against the live sandbox exactly as coded.

## Local dev setup

`RAYZA_CONNECT_ENABLED=true` + a sandbox `RAYZA_API_KEY` were added to `.env.local` (gitignored, not committed) so the integration actually fires in local dev instead of short-circuiting to `skipped: true`. No key is stored in the repo.

## Cleanup

The one test booking created (`RH-TEST-*`) was cancelled on the sandbox before this report was written; nothing test-related left pending on RAYZA's side or in Relief's own store (no app route handlers were touched by this check).
