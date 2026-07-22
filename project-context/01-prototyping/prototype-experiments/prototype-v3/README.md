# Prototype V3 - Notification Reliability

| Field | Value |
|-------|-------|
| **Delivery agent** | F — `features/agent-f-notifications` |
| **Wave** | 3 (merge **last**) |
| **QA doc** | `docs/testing/reservation-qa-checklist.md` |
| **POC plan** | `validation-reports/notification-poc-plan.md` |
| **Business KPI** | Manager notification ≥95% · response ≤15 min |

## Objective

Validate operational readiness: every booking/reservation should trigger manager alerts via SMS/WhatsApp (or both).

## Scope

- Reservation form submission
- Event inquiry submission
- Dining reservation submission
- Notification dispatch to manager channel(s)

## Success Criteria

- >= 95% successful notification delivery in test runs
- Failed deliveries are logged and recoverable
- Team can act on alerts within target response window

## Notes

- Provider options to evaluate: Twilio WhatsApp, Meta WhatsApp Cloud API, Termii, Infobip.
