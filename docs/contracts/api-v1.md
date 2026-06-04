# API v1 Contract

**Consumers:** Agent E (UI), Agent F (notifications)  
**Business context:** `docs/contracts/business-context-summary.md`

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

**Notification trigger (Agent F):** `reservation.created`

---

## Paystack

`POST /api/paystack/initialize`

Body: `{ email, itemType: "room"|"tour", itemId, nights?, guests?, demoAmountNgn? }`

**Response:** `{ ok, reference, authorizationUrl, amountNgn, demo }`

`GET /api/paystack/verify?reference=&demo=`

**Notification trigger:** `payment.verified` on success

---

## Event inquiries

`POST /api/event-inquiries`

Fields: firstName, lastName, email, phone, eventType, eventDate, guestCount, message

**Notification trigger:** `event.inquiry.created`

---

## Dining reservations

`POST /api/dining-reservations`

Fields: firstName, lastName, email, venue, reservationDate, reservationTime, partySize, notes?

**Notification trigger:** `dining.reservation.created`

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
