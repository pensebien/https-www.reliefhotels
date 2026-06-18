# API v1 Contract

**Consumers:** Agent E (UI), Agent F (notifications)  
**Business context:** `docs/contracts/business-context-summary.md`

## Room availability

`GET /api/rooms/availability`

Query: `checkIn`, `checkOut` (YYYY-MM-DD), optional `rooms` (1–4), `guests` (1–12).

**Response:** `{ ok: true, checkIn, checkOut, nights, roomsRequested, guests, available: [{ id, slug, category, priceFrom, currency, availableUnits, nights, totalFrom }] }`

Drives the Rooms catalog when dates are set via the property bar (mock inventory today; swap `getRoomAvailability` for PMS/Supabase).

---

## Reservations

`POST /api/reservations`

| Field | Type | Required |
|-------|------|----------|
| firstName | string | yes |
| lastName | string | yes |
| email | email | yes |
| stayPreference | string | yes |
| message | string | yes |

**Response:** `{ ok: true, id: string, emailSent?: boolean, demo?: boolean }`

**Notification trigger (Agent F):** none — manager SMS/WhatsApp only after verified payment (`payment.verified`)

---

## Paystack

`POST /api/paystack/initialize`

Body: `{ email, itemType: "room"|"tour", itemId, reservationId, nights?, guests?, demoAmountNgn? }`

`reservationId` is **required** — guest must complete Part 1 (`POST /api/reservations`) before payment.

**Response:** `{ ok, reference, authorizationUrl, amountNgn, demo }`

`GET /api/paystack/verify?reference=&demo=`

**Notification trigger:** `payment.verified` on success (manager SMS/WhatsApp only after verified deposit)

---

## Event inquiries

`POST /api/event-inquiries`

Fields: firstName, lastName, email, phone, eventType, eventDate, guestCount, message

**Notification trigger:** none — manager SMS/WhatsApp only after verified payment

---

## Dining reservations

`POST /api/dining-reservations`

Fields: firstName, lastName, email, venue, reservationDate, reservationTime, partySize, notes?

**Notification trigger:** none — manager SMS/WhatsApp only after verified payment

---

## Demo activity

`GET /api/demo/activity?key=`

Returns reservations + payments for dashboard.

---

## Notification payload (Agent F internal)

```typescript
type NotificationEvent =
  | "reservation.created"
  | "payment.verified"
  | "event.inquiry.created"
  | "dining.reservation.created";

type NotifyPayload = {
  event: NotificationEvent;
  referenceId: string;
  guestName?: string;
  email?: string;
  phone?: string;
  summary: string;
  metadata?: Record<string, string>;
};
```

**Delivery channels:** `sms` | `whatsapp` | `both` | `none` (demo log only)
