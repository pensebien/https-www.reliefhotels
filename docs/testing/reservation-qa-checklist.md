# Reservation QA Checklist

**Automated:** `npm run test:qa` (build + 15 unit/API tests) · `npm run test:qa:live` (adds HTTP smoke; server required)

---

## Automated (run by CI / locally)

| ID | Test | Command / file |
|----|------|-----------------|
| A1 | Production build | `npm run build` |
| A2 | 20% deposit math | `tests/unit/booking-deposit.test.ts` |
| A3 | Zod schemas (reservation + paystack init) | `tests/unit/reservation-schema.test.ts` |
| A4 | Notify only on `payment.verified` | `tests/unit/notification-policy.test.ts` |
| A5 | Create reservation → `notified: false` | `tests/api/reservation-flow.test.ts` |
| A6 | Paystack init requires `reservationId` | `tests/api/reservation-flow.test.ts` |
| A7 | Full demo flow: reserve → init → verify | `tests/api/reservation-flow.test.ts` |
| A8 | Cannot pay twice on confirmed reservation | `tests/api/reservation-flow.test.ts` |
| A9 | Event/dining inquiries → `notified: false` | `tests/api/inquiry-no-notify.test.ts` |
| A10 | HTTP pages load (optional) | `npm run test:qa:live` |
| A11 | Health endpoint storage mode | `tests/api/health.test.ts` |

---

## Manual QA only (human required)

### UI & UX

| ID | Test | Why manual |
|----|------|------------|
| M1 | Property bar date/guest modals on desktop + mobile | Visual interaction, touch targets |
| M2 | Step 1 → Step 2 booking wizard; back button preserves data | UX flow |
| M3 | Deposit amount matches UI copy (“20% deposit due now”) | Visual + calculator cross-check |
| M4 | Paystack redirect / real test card checkout | External Paystack UI |
| M5 | Payment success page layout + “manager notified” copy | Visual |
| M6 | Failed/cancelled payment → try again | Paystack cancel flow |
| M7 | Rooms catalog without dates shows prompt | Visual state |
| M8 | Room tabs filter correctly | Visual grid |
| M9 | FR / PCM locale labels on book page | Translation review |
| M10 | Mobile 375px full happy path | Device testing |

### Notifications (live)

| ID | Test | Why manual |
|----|------|------------|
| M11 | Manager receives SMS after real payment (Termii) | Physical device + provider |
| M12 | Manager receives WhatsApp (`NOTIFY_CHANNEL=both`) | Template approval + device |
| M13 | Form-only submit does **not** SMS manager | Real phone must stay silent |
| M14 | Latency ≤ 30s from payment to alert | Stopwatch on device |

### Production & ops

| ID | Test | Why manual |
|----|------|------------|
| M15 | Supabase row persists after Netlify redeploy | `GET /api/health` → `productionReady: true`; `npm run verify:supabase` |
| M16 | `NEXT_PUBLIC_APP_URL` matches live domain | Env config |
| M17 | Paystack live callback URL in dashboard | Paystack admin |
| M18 | Staff portal `reservation.…?key=…` — filters, categories, storage | Stakeholder review |
| M19 | Resend confirmation email received | Inbox check |
| M20 | Double-click pay button (no duplicate charge) | Browser behaviour |
| M21 | Walk-in booking — cash deposit | Staff portal → New walk-in booking |
| M22 | Walk-in booking — Moniepoint terminal (or demo mode) | See `docs/deploy/MONIEPOINT.md` |
| M23 | Walk-in booking — Moniepoint transfer auto-detected | See `docs/deploy/MONIEPOINT.md` — no manual reference |

---

## Quick commands

```bash
# All automated tests (no server needed)
npm run test:qa

# Automated + HTTP smoke (start dev server first)
npm run dev
# separate terminal:
npm run test:qa:live

# Against production
BASE_URL=https://reliefhotelsandsuites.com npm run test:qa:live
```

---

## Sign-off

| Role | Automated QA | Manual QA | Date |
|------|--------------|-----------|------|
| Dev | ☐ | — | |
| QA | — | ☐ | |
| Product | — | ☐ | |
