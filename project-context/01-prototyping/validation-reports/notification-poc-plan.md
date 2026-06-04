# Notification POC Plan

**Project:** Relief Hotels & Suites  
**Goal:** When a guest submits a reservation, booking, event inquiry, or dining request, the **hotel manager receives an alert via SMS and/or WhatsApp** within seconds.

**Success criteria:** ≥ **95%** delivery success in test runs; actionable message format; failed sends logged.

---

## Business Requirement (Phase 0)

> Reserved rooms and bookings must notify the hotel manager via SMS or WhatsApp (or both) so the team can respond quickly (target: ≤ 15 minutes during service hours).

---

## Triggers (what sends a notification)

| Event | API route | Manager message priority |
|-------|-----------|--------------------------|
| Reservation inquiry | `POST /api/reservations` | High |
| Paid deposit initiated | `POST /api/paystack/initialize` | High |
| Payment verified | `GET /api/paystack/verify` | High |
| Event inquiry | `POST /api/event-inquiries` | Medium |
| Dining reservation | `POST /api/dining-reservations` | Medium |

---

## Provider Options (Nigeria-friendly)

| Provider | Channel | Pros | Cons | Est. cost |
|----------|---------|------|------|-----------|
| **Termii** | SMS, WhatsApp | Nigeria-focused, simple API | WhatsApp may need business approval | Low per SMS |
| **Twilio** | SMS, WhatsApp | Reliable, global | Setup + WhatsApp template approval | Medium |
| **Meta WhatsApp Cloud API** | WhatsApp | Direct Meta integration | Business verification, templates | Low per message |
| **Infobip** | SMS, WhatsApp | Enterprise-grade | Higher complexity | Medium |

**POC recommendation:** Start with **Termii SMS** for fastest demo; add **WhatsApp** in phase 2 once templates are approved.

---

## POC Architecture (target)

```
Guest form submit
    → API route (reservations / inquiries)
    → Save record (DB or file store)
    → Notification service (new module)
        → Termii SMS API  ──→ Manager phone
        → (optional) WhatsApp API ──→ Manager WhatsApp
    → Log delivery status (success / failed / retry)
```

**Manager contact (configure in env):**

```env
MANAGER_PHONE=+234803xxxxxxx
MANAGER_WHATSAPP=+234803xxxxxxx
NOTIFY_CHANNEL=sms          # sms | whatsapp | both
TERMII_API_KEY=...
TERMII_SENDER_ID=Relief
```

---

## Message Templates (draft)

### SMS — New reservation
```
Relief Hotels: New reservation from {firstName} {lastName}.
Stay: {stayPreference}. Check dashboard or email for details.
Ref: {id}
```

### SMS — Payment received
```
Relief Hotels: Payment received ₦{amount} from {email}.
Ref: {reference}. Confirm with guest ASAP.
```

### SMS — Event inquiry
```
Relief Hotels: Event inquiry — {eventType}, {guestCount} guests, {eventDate}.
Contact: {firstName} {lastName}, {phone}.
```

### WhatsApp (requires approved template)
Use provider-approved template with variables: `guest_name`, `booking_type`, `reference`.

---

## POC Test Plan

### Phase A — SMS only (Week 1)

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| 1 | Submit contact reservation form | Manager SMS within 30s | |
| 2 | Submit event inquiry | Manager SMS within 30s | |
| 3 | Submit dining reservation | Manager SMS within 30s | |
| 4 | Complete demo payment | Manager SMS with amount + ref | |
| 5 | Invalid manager phone in env | Error logged, no silent fail | |
| 6 | Termii API down | Retry or log; user still sees success | |

### Phase B — WhatsApp (Week 2, optional)

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| 7 | WhatsApp template message | Delivered to manager | |
| 8 | Both SMS + WhatsApp | Both channels receive | |

**Run each test 10 times → calculate delivery rate = (success / 10) × 100%**

---

## Implementation Checklist (engineering)

- [ ] Create `src/lib/notifications.ts` (send SMS/WhatsApp abstraction)
- [ ] Add env vars to `.env.example`
- [ ] Call notifier from `/api/reservations` after save
- [ ] Call notifier from `/api/event-inquiries` after save
- [ ] Call notifier from `/api/dining-reservations` after save
- [ ] Call notifier from `/api/paystack/verify` on success
- [ ] Log delivery status to demo dashboard or file
- [ ] Document manager phone in secure env (never commit)

---

## Fallback (demo / POC without provider keys)

If Termii keys are not ready:

1. Log notification payload to server console
2. Show pending alerts in `/demo` dashboard
3. Optional: send email via Resend to `RESERVATION_EMAIL` as backup

Label clearly as **demo mode** until SMS is live.

---

## Acceptance Criteria (POC complete)

| Criterion | Target |
|-----------|--------|
| Delivery success rate | ≥ 95% in 10-run test |
| Latency | ≤ 30 seconds from submit to manager device |
| Message contains guest name + action type | Yes |
| Failed sends logged | 100% |
| No PII in client-side logs | Verified |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| WhatsApp template delay | Ship SMS first |
| ngrok URL changes | Use for UI demo only; test notifications on localhost |
| Manager phone wrong | Verify with test ping before client demo |
| Cost overrun | SMS only for high-priority events in POC |

---

## Sign-off (POC complete)

| Role | Name | Date | Approved |
|------|------|------|----------|
| Executive Sponsor | Kalu | | |
| Tech Lead | | | |
| Operations (Manager) | | | |
