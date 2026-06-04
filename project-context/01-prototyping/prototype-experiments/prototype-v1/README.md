# Prototype V1 - Core Booking Journey

| Field | Value |
|-------|-------|
| **Delivery agent** | E — `features/agent-e-prototype-v1-booking` |
| **Wave** | 3 |
| **QA doc** | `docs/testing/agent-e-prototype-v1-booking-TESTS.md` |
| **Business context** | `project-context/00-business-context/success-metrics.md` KPI 1–3 |

## Objective

Validate that users can discover rooms and complete a secure booking intent flow without friction.

## Scope

- Home -> Rooms -> Book flow
- Booking form submission
- Payment initialization (test mode)
- Success callback and reference visibility

## Success Criteria

- User can complete flow in under 3 minutes
- No blocking errors in core path
- Reservation event is recorded server-side

## Notes

- This version prioritizes conversion over advanced personalization.
- Full PMS integration is out of scope for V1.
