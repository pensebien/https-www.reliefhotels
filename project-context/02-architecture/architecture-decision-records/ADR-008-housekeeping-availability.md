# ADR-008: Housekeeping — checkout hand-off, room blocks, calendar visibility

**Date:** 2026-08-12
**Status:** Accepted
**Deciders:** Tech Lead
**Traces to:** ADR-007 (staff identity/RBAC — `cleaner_head` role), `hms-expansion-roadmap.md`

## Context

**Phase 0 requirement:** none — Wave 2, Phase 1 of the in-house HMS.

Two things were true before this phase, discovered while implementing it:

1. **Availability already respected room blocks.** `countOccupiedUnits()` (`src/lib/db/inventory-store.ts`) has always summed `reserved + blocked` units, and `getRoomAvailability()` already excludes fully-blocked rooms from results. This was correct but completely untested.
2. **Room blocks were invisible on the calendar.** `buildInventoryCalendar()` never received room blocks — a blocked room showed as plain "free" on `/staff/calendar`, a confusing mismatch against what booking attempts would actually do.
3. **No housekeeping workflow existed at all.** No "checked out" reservation status, no way to flag a room dirty on checkout, no dashboard for the new `cleaner_head` role to manage any of it, and `RoomBlock` had no way to distinguish a maintenance hold from a post-checkout cleaning hold.

## Decision

1. **Calendar visibility (Agent Q):** add a `"blocked"` cell status, sourced from `listRoomBlocks()` and threaded through the same greedy per-unit assignment already used for real bookings (`assignBookingsToUnits`) so a block and a real reservation never render on the same unit cell. Blocked cells are shown but not clickable — there's no "detail sheet" for a block yet, just visibility.
2. **`RoomBlock.blockType: "maintenance" | "housekeeping"`** distinguishes the two purposes. No new `readyAt` field — the existing `checkOut` field already *is* "when this room is free for booking" at this system's native day granularity; adding a second field for the same concept would be redundant.
3. **New `checked_out` reservation status**, reachable only from `confirmed` via `PATCH /api/demo/reservations/{id}`. On success, the room is auto-blocked as `housekeeping` from today through tomorrow — a same-day cleaning hold, cleared early by the cleaner once actually done (see next point), or naturally superseded if the cleaner sets a longer window while it's still open.
4. **`/staff/housekeeping`** (new): lists all open blocks (both types), lets `cleaner_head` create a block (choosing room, type, date range, reason) or clear one instantly ("mark clean" = delete the block, reusing the existing `deleteRoomBlock`). `manager` gets read-only access, matching `ACCESS_MATRIX`. No block-editing endpoint — create + delete covers "flag dirty" and "mark ready" without inventing an update API for an MVP.
5. Tightened `POST`/`DELETE /api/staff/room-blocks` to `cleaner_head` only (was `[cleaner_head, manager]` from an earlier pass in Phase 0, before the read/full distinction in `ACCESS_MATRIX` had an actual write UI to enforce against). `GET` still allows both.

## Options considered

| Option | Pros | Cons | Result |
|--------|------|------|--------|
| Per-physical-unit housekeeping (real room numbers) | Matches real hotel ops more precisely | Reservations aren't bound to a specific unit anywhere in this codebase today — would require a new persisted unit-assignment concept just for this | Rejected for now — type-level blocking matches the existing availability engine's own granularity |
| Add a separate `readyAt` timestamp | More explicit | Redundant with `checkOut`; the rest of the system has no time-of-day granularity to act on it anyway | Rejected |
| Auto-expire blocks via a cron/scheduled job | No manual "mark clean" step | Needs a scheduler this project doesn't have yet (Netlify scheduled functions are a listed future item, not present); a block clearing itself with no human confirmation risks a room being offered before it's actually clean | Rejected — manual mark-clean is the safer default |

## Consequences

**Positive:** the calendar now shows the truth; a real (if simple) housekeeping workflow exists end-to-end; the previously-silent block→availability link now has a regression test.
**Negative:** blocking is still type-level, not per-physical-room — two blocked units of the same room type are indistinguishable to the cleaner beyond count.
**Mitigation:** revisit if/when reservations gain real per-unit assignment (would also benefit the calendar's existing greedy-assignment display, which already recomputes unit placement on every render rather than persisting it).

## Success criteria

- A confirmed reservation can be checked out, which blocks its room type for housekeeping immediately.
- `/staff/housekeeping` lets `cleaner_head` clear that block, after which the room is bookable again from today.
- `manager` can view but not create/delete blocks; `cashier`/`restaurant_owner` can't reach the page at all.

## Rollback

Remove the `checked_out` transition from `staffReservationPatchSchema` and hide `/staff/housekeeping` from nav — existing maintenance-block behavior (already correct) is untouched either way.
