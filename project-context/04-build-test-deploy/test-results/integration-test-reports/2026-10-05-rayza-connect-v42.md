# RAYZA Connect — API v4.2 integration

| Date | Tester | Scope | Result |
|------|--------|-------|--------|
| 2026-10-05 | Tech Lead (Claude Code) | Relay v4.2.0: room linking and inventory, availability, booking push, room move, cancellation, scheduled retry | **PASS** (after fixes below) |

## What the live sandbox showed before the fixes

| # | Finding | Effect on the old client |
|---|---------|--------------------------|
| 1 | RAYZA has its own room types (`standard-deluxe`, `luxurious-suite`, …); Relief slugs return `422 INVALID_ROOM_TYPE` | Every push was rejected |
| 2 | `amount` is required | Unpaid bookings rejected (`422 VALIDATION_ERROR`) |
| 3 | References not starting with `BK-` are rewritten (`RH-TEST-1-d` → `BK-1-d`) | Cancel by our reference → `404`, which the client treated as success: rooms were **never released** |
| 4 | Errors are `{"status":"rejected","error":{"code","message"}}` | Error parser only read `detail` |
| 5 | Double cancel now returns `200 already_cancelled` | — |
| 6 | `GET /v1/rooms` without dates lists only rooms free today (docs: all rooms) | — (new code fills the rest) |
| 7 | Guest self-cancel and non-lead lines of a group booking never reached RAYZA | Rooms stayed held / never booked |

## Live end-to-end (app code → real sandbox, file mode, test bookings dated 2027-02-15 → 17)

| # | Step | Result |
|---|------|--------|
| 1 | Link guest-room → standard-deluxe, executive-room → luxurious-suite | ✔ |
| 2 | Import room numbers | ✔ 6 (`310…501`) and 3 (`101,112,201`) incl. rooms occupied today |
| 3 | Availability = min(Relief, RAYZA) | ✔ 6 / 6 |
| 4 | Staff confirm → push | ✔ `BK-RH-C82407E6DE99` kept by RAYZA; RAYZA free 6 → 5 |
| 5 | Repeat push | ✔ `already_received`, free stays 5 |
| 6 | Room move | ✔ `PATCH` 200 |
| 7 | Staff cancel | ✔ free back to 6 |
| 8 | Two-room booking | ✔ two refs `-1`, `-2`; free 6 → 4 |
| 9 | Guest self-cancel | ✔ both released; free back to 6 |
| 10 | Occupancy refusal | ✔ parsed as `OCCUPANCY_LIMIT_EXCEEDED` |
| 11 | Sandbox left as found | ✔ free 6 (started 6); all test bookings cancelled |

## Automated

- `tests/unit/rayza-connect.test.ts` — references, payloads, error shapes, catalogue, availability rules (7).
- `tests/api/rayza-sync.test.ts` — against a fake relay that mimics the sandbox: linking/import, availability incl. front-desk bookings and occupancy, live re-check on booking, fail-open, push/move/cancel, guest cancel, refusal flagged then retried by cron (no backfill of demo or pre-link bookings), cron auth, flag off (8).
