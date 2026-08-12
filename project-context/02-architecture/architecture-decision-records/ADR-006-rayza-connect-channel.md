# ADR-006: RAYZA Connect — outbound, non-blocking channel relay

**Date:** 2026-08-12
**Status:** Accepted
**Deciders:** Tech Lead
**Traces to:** `02-architecture/integration-points.md` §5a · `05-monitoring-value/improvement-backlog.md` (P3 "PMS integration")

## Context

**Phase 0 requirement:** none — RAYZA Connect is not part of the original business case. It is a third-party channel-manager SaaS (`cloud-relay-nu.vercel.app`) whose maintainer shared a live sandbox and a test API key so Relief could open an integration channel to it.

**Phase 1 learning:** a stub already existed (`src/lib/integrations/rayza-connect.ts`, wired into the staff reservation PATCH route) but had never been validated against the live API. Testing it against the real sandbox and its `/openapi.json` spec surfaced several bugs that meant the sync had never actually worked:

- Auth header sent the raw key (`authorization: <key>`); the live API requires `Authorization: Bearer <key>` and returns 401 without it.
- No booking amount was ever sent (`amount` is a real field on `BookingIn`, naira, resolved from the matched `PaymentRecord`).
- The room identifier was a fabricated uppercase/underscore transform of Relief's room id; RAYZA has no catalog of Relief's rooms to map against — any string is accepted and stored as-is.
- Cancel treated RAYZA's 404 ("already cancelled/unknown reference") as a failure instead of idempotent success.
- Error bodies (FastAPI `{"detail": ...}`) were surfaced raw instead of unwrapped into a readable message.

Relief is also building its own in-house Hotel Management System separately (the `agent-*` workstream: `hms-fnb`, `hms-roles`, `hms-accounting`, `hms-calendar`, cashier modules). RAYZA is a bridge to an external channel manager, not Relief's system of record.

## Decision

1. Fix the existing push/cancel sync so it actually works against the live API (correct auth, fields, idempotency, error messages).
2. Keep the integration **outbound-only and non-blocking**: it fires when staff confirm or cancel a reservation that Relief's own store already accepted. It never gates the guest or staff booking-creation path — Relief's internal `getRoomAvailability` check remains the sole authority on whether a room can be booked.
3. Reuse Relief's own room `id` as the RAYZA room identifier (no separate mapping table to maintain).
4. Do **not** implement RAYZA's rate/tax/service *push* endpoints (`POST /v1/rates|taxes|services`) yet — they require real hotel tax percentages and service pricing Relief hasn't defined anywhere in the app; pushing invented numbers would misrepresent the business.
5. Do **not** pull bookings created on other RAYZA-connected channels back into Relief's store (`GET /v1/bookings`, `POST /v1/bookings/{ref}/ack`) — that's a reconciliation feature for if/when RAYZA becomes a real revenue channel, not a "connectivity" requirement.

## Options considered

| Option | Pros | Cons | Result |
|--------|------|------|--------|
| Fix outbound sync only (this ADR) | Matches existing hook points; no new risk to guest funnel; closes real bugs | Doesn't yet prevent double-booking *from* other RAYZA channels | **Accepted** |
| Also gate guest/staff booking creation on `GET /v1/availability` | Matches RAYZA's stated purpose ("prevents double-booking") | Adds a hard external dependency to the core booking path; sandbox downtime could block guests | Rejected for now |
| Full bidirectional sync (push rates + pull bookings + ack) | Closest to a real PMS integration | Requires real tax/pricing data and a reconciliation model for externally-created bookings that don't exist in Relief's own store yet — out of proportion to "open a channel" | Rejected; revisit as P3 PMS integration matures |

## Rationale

The repo's existing integration principle (`integration-points.md` §9) is "never lose the booking record because a secondary channel failed" — Paystack, Resend, and Termii already follow this pattern. RAYZA should follow the same shape rather than becoming a new point of failure in the guest funnel. Fixing the real, verified bugs in the existing scaffold delivers a working channel today without inventing business data (tax rates, service prices) or building a reconciliation feature nobody has asked for.

## Consequences

**Positive:** the sync that already existed on paper now actually reaches RAYZA; staff-visible sync errors (`rayza.error` in the PATCH response) are readable; double-cancels and retried pushes are idempotent.
**Negative:** Relief still has no visibility into bookings RAYZA's other channels might create against the same room/dates — a real double-booking risk if RAYZA is used as more than a connectivity pilot.
**Mitigation:** revisit this ADR once RAYZA carries real inventory/pricing, or once a decision is made to treat it as more than a pilot channel.

## Success criteria

- `pushReservationToRayza` / `cancelReservationOnRayza` return `{ok:true}` against the live sandbox with `RAYZA_CONNECT_ENABLED=true` and a valid key.
- A failed RAYZA call never prevents a reservation status change from persisting in Relief's own store.

## Rollback

Set `RAYZA_CONNECT_ENABLED=false` (or unset `RAYZA_API_KEY`) — every exported function short-circuits to `{ok:true, skipped:true}` and the staff reservation flow is unaffected.
