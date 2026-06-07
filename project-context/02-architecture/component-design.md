# Component Design

**Application:** `reliefhotels` (Next.js 16 App Router)  
**Repo layout:** Feature phases + shared `src/components`, `src/lib`, `src/app/api`

## 1. Layered structure

```text
┌─────────────────────────────────────────────────────────────┐
│ Presentation (React Server + Client Components)             │
│  app/[locale]/*  ·  components/*  ·  features/*/components  │
├─────────────────────────────────────────────────────────────┤
│ Application / API (Route Handlers)                          │
│  app/api/reservations|paystack|event-inquiries|dining|demo    │
├─────────────────────────────────────────────────────────────┤
│ Domain services (lib)                                         │
│  demo-store · inquiry-store · notifications · email · paystack│
├─────────────────────────────────────────────────────────────┤
│ Content & config                                            │
│  content/* · features/*/content · lib/config.ts             │
├─────────────────────────────────────────────────────────────┤
│ External adapters                                           │
│  Paystack API · Resend API · Termii API                     │
└─────────────────────────────────────────────────────────────┘
```

## 2. Routing & i18n

| Component | Responsibility |
|-----------|----------------|
| `middleware.ts` | `next-intl` locale detection; excludes `/api`, static assets |
| `i18n/routing.ts` | Locales: `en`, `fr`, `pcm`, `ig`, `yo` |
| `app/[locale]/layout.tsx` | Locale shell, fonts, header/footer |
| `app/layout.tsx` | Root HTML shell |

**Convention:** All public pages under `/[locale]/...`. APIs are locale-agnostic at `/api/*`.

## 3. Feature modules (by delivery phase)

| Module path | Scope | Key surfaces |
|-------------|-------|--------------|
| `features/phase-1-foundation` | Events and meetings teasers, signature experiences | Home sections |
| `features/phase-2-product-expansion` | Events, dine & wine, forms | `/events`, `/dine-wine` |
| `features/phase-3-production-polish` | SEO landings, schema, mock CMS types | `/luxury-hotel-calabar`, etc. |

Shared marketing sections live in `components/sections/*` (hero, stats, CTA, contact).

## 4. UI components (booking & payments)

| Component | Type | Role |
|-----------|------|------|
| `booking-form.tsx` | Client | Room reservation → `POST /api/reservations` |
| `paystack-checkout.tsx` | Client | Deposit init → Paystack redirect |
| `payment-callback.tsx` | Client | Verify reference on return URL |
| `event-inquiry-form.tsx` | Client | Corporate/events lead capture |
| `dining-reservation-form.tsx` | Client | Restaurant reservation request |
| `demo-dashboard.tsx` | Server/Client | Ops view of activity (key-gated) |
| `demo-banner.tsx` | Client | Visible when `DEMO_MODE` or test keys |

## 5. API Route Handlers

| Route | Handler flow |
|-------|----------------|
| `POST /api/reservations` | Validate → `addReservation()` → `sendReservationEmail()` → `notifyManager(reservation.created)` |
| `POST /api/paystack/initialize` | Validate → Paystack or demo amount → return `authorizationUrl` |
| `GET /api/paystack/verify` | Verify with Paystack → `addPayment()` → `notifyManager(payment.verified)` |
| `POST /api/event-inquiries` | Validate → `addEventInquiry()` → notify |
| `POST /api/dining-reservations` | Validate → `addDiningReservation()` → notify |
| `GET /api/demo/activity` | Query param `key` === `DEMO_DASHBOARD_KEY` → merge demo seed + live store |

**Validation:** Zod schemas colocated in route files (v1). Future: shared `lib/schemas/*`.

## 6. Domain libraries

### `lib/demo-store.ts`

- **Entities:** `ReservationRecord`, `PaymentRecord`  
- **Storage:** `data/demo-store.json` (gitignored in prod workflow)  
- **Production target:** `reservations`, `payments` tables (ADR-001)

### `lib/inquiry-store.ts`

- **Entities:** Event inquiries, dining reservations  
- **Storage:** `data/inquiries.json`  
- **Production target:** `event_inquiries`, `dining_reservations` tables

### `lib/notifications.ts`

- **Entry:** `notifyManager(NotifyPayload)`  
- **Channels:** `NOTIFY_CHANNEL` env — `console` | `sms` | `whatsapp` | `both` | `none`  
- **Provider:** Termii SMS (`sendTermiiSms`); WhatsApp stub for future

### `lib/email.ts`

- Resend when `RESEND_API_KEY` set; otherwise no-op with `emailSent: false`

### `lib/paystack.ts` + `lib/config.ts`

- `getServerConfig()`: demo mode when secret missing or `DEMO_MODE=true`  
- Paystack initialize/verify helpers

## 7. Content model (v1)

| Source | Type | Notes |
|--------|------|-------|
| `content/site.ts` | Static TS | Nav, copy blocks |
| `content/gallery.ts` | Static TS | Image metadata |
| `features/*/content/*.ts` | Static TS | Rooms, events, dining copy |
| `features/phase-3-production-polish/content/mock-cms.ts` | Mock CMS | Shapes for future headless CMS |

No runtime CMS in Phase 2; content changes = PR to TS files (acceptable for launch scope).

## 8. Security boundaries

| Zone | Trust |
|------|-------|
| Browser | Public Paystack key only; no secrets |
| Route Handlers | Secrets, DB, notification sends |
| Demo dashboard | Shared secret via query key — **not** auth-grade |

## 9. Planned refactors (post-architecture sign-off)

1. **Repository layer** — `lib/repositories/*` swapping file vs Postgres implementations  
2. **Idempotency** — Paystack verify by `reference` unique constraint  
3. **Notification outbox** — async retry for Termii failures  
4. **Structured logging** — correlation id per booking request  

See [architecture-decision-records/](architecture-decision-records/) for binding decisions.
