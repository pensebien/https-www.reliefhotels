# RAYZA Connect — live integration test report

| Date | Tester | Scope | Result |
|------|--------|-------|--------|
| 2026-08-12 | Tech Lead (Claude Code) | RAYZA Connect end-to-end, live sandbox | **PASS** (1 upstream bug found, reported below) |

## What was tested

Every real code path that changes a reservation's status was driven through Relief's actual route handlers (in-process, isolated file-store copy — no shared data, no HTTP server) and cross-checked against the live sandbox at `https://cloud-relay-nu.vercel.app` using the test key from CodedMan, via `GET /v1/bookings`.

| # | Flow | Path exercised | Result |
|---|------|-----------------|--------|
| 1 | Guest booking + Paystack (demo verify) | `POST /api/reservations` → `POST /api/paystack/initialize` → `GET /api/paystack/verify?demo=1` | ✔ Landed on RAYZA: `amount: 74000`, `room_identifier: "signature-suite"`, correct dates |
| 2 | Staff walk-in, cash, immediate confirm | `POST /api/demo/reservations` (`status: confirmed`, `paymentMethod: cash`) | ✔ Landed on RAYZA with `amount: 38000` |
| 3 | Walk-in Moniepoint transfer | `POST /api/demo/reservations` (pending) → `GET /api/demo/payments/{ref}/status` (demo auto-success poll) | ✔ Confirmed **not** pushed while payment pending; pushed with `amount: 50000` once the poll promoted it to success |
| 4 | Front-desk cashier settle (cash) | `POST /api/reservations` (pending) → `POST /api/staff/cashier/settle` | ✔ Landed on RAYZA with `amount: 185000` |
| 5 | Staff manual confirm/cancel (demo dashboard) | `PATCH /api/demo/reservations/{id}` (confirm, then cancel) | ✔ Confirmed → pending on RAYZA; cancelled → `status: cancelled` on RAYZA; a second cancel stayed idempotent (no error surfaced to staff) |
| 6 | Resilience | Same walk-in flow with `RAYZA_API_KEY` swapped for an invalid key | ✔ Reservation still created and returned `200`; failure was logged (`[rayza] push failed ... Invalid API key`), never surfaced as an error to the guest/staff caller |

All 15 individual assertions passed. Full transcript available on request (not persisted — used a temporary API key visible in it).

## Gap found and fixed during this test pass

Before this pass, `pushReservationToRayza` was only ever called from the manual staff-dashboard "confirm" button (`PATCH /api/demo/reservations/{id}`). None of the 6 real paths above called it — meaning in production, essentially no paid booking would ever have reached RAYZA. Fixed by adding a `syncConfirmedReservationToRayza` fire-and-forget wrapper (logs on failure, never throws) at each of the 6 confirmation call sites:

- `src/app/api/paystack/verify/route.ts`
- `src/app/api/demo/reservations/route.ts`
- `src/lib/moniepoint-sync.ts`
- `src/lib/paystack-terminal.ts` (2 call sites)
- `src/lib/cashier/settle-service.ts` (2 call sites)

## Bug found on RAYZA's side (report to CodedMan)

`DELETE /v1/bookings/{reference}` returns `500 Internal Server Error` (plain text `"Internal Server Error"`) for every reference tried, including ones that exist. Test cleanup fell back to `POST /v1/bookings/{reference}/cancel` instead, which works correctly. Not a blocker for Relief's integration (we don't call `DELETE`), but worth flagging upstream — soft-delete via cancel is fine as Relief's permanent approach either way.

## Cleanup

All test bookings created during this run were cancelled on the RAYZA sandbox afterward (`POST .../cancel`, confirmed via `GET /v1/bookings?status=pending` showing none of the test references left pending). No test data was left in Relief's own store or Supabase — the test ran against an isolated file-store copy, never the shared dev database.
