# Sirvoy feature map (reference for Relief HMS)

Captured 2026-10-03 from a fresh Sirvoy test property (read-only browsing of every
admin screen and settings form). Sirvoy holds **no Relief data** — this is a map of
what to mimic, not a migration source. Status column is relative to
`feat/booking-engine-v2` (PR #43).

Legend: ✅ have · 🟡 partial · ⬜ missing · ➖ not needed

**Status update (feat/sirvoy-parity):** built since this map was captured — PR #44 room setup,
room numbers, invoices, refunds, group bookings; PR #45 reports, guest messages, online check-in;
this branch restrictions (no arrival / no departure / closed by weekday), stay length by arrival
day (incl. whole weeks), weekday seasons, rate plans (price lists), extras per room / per
room-night / always included, housekeeping board with recurring tasks, and booking-engine options
(request mode, booking window, arrival-time question). Still open: channel manager (Phase 3),
guest CRM profiles, custom booking fields, multiple booking engines, ledger accounts, webhooks.

## Daily operations (main menu)

| Sirvoy screen | What it does | Relief | Plan |
|---|---|---|---|
| Dashboard | New bookings, reminders, today's check-ins/outs, occupancy %, available rooms, setup checklist, booking search with filters (source, payment status, room, extras, coupon, dates) | 🟡 staff dashboard + inbox | P2 reports (KPIs), P1 search filters |
| New booking (front desk) | Same engine as guests, dates + guests, "Ignore restrictions (staff only)" toggle, show availability | ✅ walk-in dialog uses the engine with "Override stay rules" | — |
| Bookings | List: booking no., name, guests, room, extras, check-in/out, **tags**, total, paid; filter payment status (unpaid / partial / paid / overpaid), made by, source | 🟡 lists exist; no tags, no paid/overpaid filter | P1 |
| Calendar | 30-day grid by room; filter room type; sort by room / type / beds | 🟡 7-day grid by unit | P1 room numbers + assignment |
| Rates | Rate grid per room type per date | 🟡 rules editor, no per-date grid | P1 (rate calendar view) |
| Rooms (units) | Daily room list: booking info, overnight guests, **cleaned / not cleaned**, print | 🟡 housekeeping blocks | P1 housekeeping status |
| Guests | Guest CRM: new / returning / blocked, active, company, purpose of stay, country, language, tags, totals paid | ⬜ | P2 guest profiles |
| Payments | All payments, linked to booking / invoice / POS receipt / unlinked, method, status | 🟡 accounting ledger | P1 invoices link payments |
| Statistics | Value (room vs extras), **ADR, RevPAR**, occupancy usage, guests, guest nights, room nights, new bookings by source and by staff member, occupancy charts, nationalities | ⬜ | P2 reports |

## Settings

### Accommodations (room types)
Name, description (per language), images, number of guests, **extra beds**, price model
(fixed / flexible), price, object type (room, apartment, villa…), **amenities checklist**
(wifi, TV, AC, fan, fridge, microwave, coffee machine, washing machine, shower, bath,
accessible, pet friendly, non-smoking, gym, pool, wake-up service), categories, sort order,
internal-only room type, duplicate from existing. Rooms (physical units) belong to a type.
→ Relief: 🟡 types in code; **P1 item 1** adds inventory, room numbers, photos, online on/off.

### Extras
Name, description, images, price, sort order, internal-only, room types it applies to,
**quantity rule** (one / ten / hundred, per guest, per searched guest, per night, per guest
per night, per room, per room per night), choice range (0–max, 0-or-max, always included),
default quantity, **limited stock per day**, offered on check-in / mid-stay / check-out,
limited-time offer window.
→ Relief: 🟡 per stay / night / guest-night only. **P1: add per room, per room-night,
max per booking, stock per day, always-included.**

### Pricing
- **Temporary prices**: date range + **weekdays affected** (Mo–Su), new price or change per room type.
- **Price lists**: alternative rate plans (e.g. non-refundable, corporate).
- **Longer stay pricing**: weekly / monthly / adjusted nightly (amount or %), stays between N–M nights, check-in weekday.
- **Coupons**: code, description, valid dates, **bypass restriction**, **bypass payment requirement** (or bypass but allow prepayment), % discount, % / fixed / new price **per item**, separate rooms vs extras discount.
→ Relief: 🟡 seasons (no weekday filter), long-stay %, coupons % / amount + skip min stay.
**P1: weekday filter on seasons, rate plans (price lists), coupon per-item and rooms-vs-extras.**

### Availability
- **Restrictions**: date range, weekdays, room types, choose **block check-ins** / **block check-ins & stays** / **block check-outs**.
- **Stay length**: per check-in weekday and room type, min / max nights, **increment** (any, full weeks, 3–4 nights or full weeks).
→ Relief: 🟡 closed-to-arrival + min/max nights. **P1: closed (stop-sell), closed-to-departure, weekday rules.**

### Booking engines
Multiple engines (per room type or extras only), T&C link, Google Ads / Analytics / Meta
Pixel IDs, nights display (nights or weeks+nights), coupon field hide / required / optional,
category step, guest picks room number (hide / optional / required), availability calendar
(hide / collapsed / expanded), **booking window** (min / max days in advance, same-day cut-off hour).
- **Options**: default and max guests, **instant confirmation vs request-until-confirmed**,
  guest label (guests / adults / adults & children…), **auto room assignment** (minimise gaps,
  by room id asc/desc, random), send email / SMS by default.
- **Default fields**: address, email, passport no., comments, purpose of stay, phone, invoice
  reference, **estimated arrival time** — each hidden / internal / optional / required.
- **Custom fields**: text or checkbox, required, internal.
→ Relief: 🟡 one engine, fixed fields. **P2: booking window, request mode, guest field config,
custom fields, analytics IDs. P1: auto room assignment (minimise gaps).**

### Guest portal (self-service)
Cancellations not / always / sometimes allowed + **deadline (hours before, at 12:00/18:00/24:00)**,
intro text, **self check-in from a set time + check-in message**.
→ Relief: ✅ cancel with free window; ⬜ self check-in. **P2 online check-in.**

### Financials
- Card payments provider (Stripe / PayPal / Sirvoy Vault) → Relief uses Paystack + Moniepoint ✅.
- **Surcharges** (named %), **taxes included** with separate default rates for rooms, extras,
  other items, tax type (VAT etc.), show VAT on booking.
- **Invoicing module**: payment terms (7–30 days NET), invoice language, rounding (0–2 dp),
  prices incl. / excl. VAT, template (tax rate per row), payee, footer, message,
  **numbering format with {id}, counter, padding, reset yearly / monthly / daily**,
  separate **cash receipt numbering**.
- **Chart of accounts**: revenue, assets, payment-method ledgers (bank transfer, card, cash,
  gift card, cheque), accounts receivable, prepaid, liabilities, rounding.
→ Relief: 🟡 VAT for folio only, receipts. **P1 item 3 invoices: numbering format + yearly reset,
VAT per rooms/extras/other, incl/excl display, payment terms, credit notes; ledger accounts later.**

### Communications
Languages; **email templates** — automated by check-in / check-out / booking date ± N days,
or on event (booking confirmation, check-in confirmation, cancellation, request received),
filtered by booking category, with footer; **SMS templates** with the same triggers;
email footer; email CC; Tripadvisor Review Express.
→ Relief: 🟡 fixed emails. **P2 item 2: same trigger model (event or ±N days from
check-in / check-out / booking), email + SMS/WhatsApp, footer, CC.**

### Housekeeping
Tasks with **frequency** (daily … every 30th day), scheduled on check-in / mid-stay /
check-out, optimise frequency, which rooms; **track room readiness** (cleaned flag per room).
→ Relief: 🟡 checkout block + mark clean. **P1: per-room clean status + recurring tasks.**

### Account
Localization (date / time format, time zone, week start, **hour automated messages go out**,
currency), logo, booking export / import, **booking-event webhooks** (callback URL).
→ Relief: ⬜ webhooks (optional extra), localization fixed to Lagos/NGN ➖.

### Channels
Booking.com, Expedia, Hotels.com, Agoda, Airbnb, Google Hotel Ads, Hostelworld,
TripAdvisor, Siteminder, Myallocator, iCal (needs room types + rooms first).
→ Relief: ⬜ **Phase 3** via a channel-manager provider; **iCal export/import** is a cheap first step.

### Website builder ➖ (Relief has its own site) · Users 🟡 (staff roles exist)
