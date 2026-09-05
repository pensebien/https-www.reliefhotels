# Integration Points

**Contract reference:** [docs/contracts/api-v1.md](../../docs/contracts/api-v1.md)

## 1. Integration map

| System | Direction | Protocol | Auth | Phase |
|--------|-----------|----------|------|-------|
| Paystack | Outbound + callback | HTTPS REST | Secret key (server), public key (client) | Live |
| Resend | Outbound | HTTPS REST | API key | Live |
| Termii | Outbound | HTTPS REST | API key | Live (SMS) |
| ngrok | Inbound tunnel | HTTPS | N/A | Demo only |
| Supabase Postgres | Outbound | HTTPS/SQL | `DATABASE_URL` | Production |
| WhatsApp (Termii or Meta) | Outbound | HTTPS REST | Provider keys | **Launch** |
| RAYZA Connect (channel relay) | Outbound (best-effort) | HTTPS REST | Bearer API key | Pilot |

## 2. Paystack (payments)

**Purpose:** Collect room/tour deposits in NGN; satisfy Primary KPI (paid bookings).

| Item | Detail |
|------|--------|
| Dashboard | https://dashboard.paystack.com |
| Client flow | `POST /api/paystack/initialize` → redirect `authorization_url` → user pays → return `/[locale]/payment/callback` → `GET /api/paystack/verify` |
| Callback URL | `{NEXT_PUBLIC_APP_URL}/payment/callback` (must match env on every host change) |
| Demo | `DEMO_MODE=true` or missing secret simulates success without live charge |
| Webhooks | Optional v2 — v1 uses redirect verify only |
| Idempotency | Same `reference` must not create duplicate payment rows (production constraint) |

**Data exchanged:** email, amount (kobo), reference, item metadata (`itemType`, `itemId`, `nights`, `guests`).

**Failure modes:** User abandons checkout; verify fails → show retry + support contact; log reference for manual reconciliation.

## 3. Resend (email)

**Purpose:** Deliver reservation copy to `RESERVATION_EMAIL`; guest confirmation optional v2.

| Item | Detail |
|------|--------|
| Trigger | Successful `POST /api/reservations` |
| From | `EMAIL_FROM` (verified domain in production) |
| To | `RESERVATION_EMAIL` |
| Fallback | `emailSent: false`; manager SMS still fires if configured |

## 4. Termii (SMS notifications)

**Purpose:** Manager alert within 15-minute response KPI ([success-metrics](../00-business-context/success-metrics.md)).

| Item | Detail |
|------|--------|
| Endpoint | `https://api.ng.termii.com/api/sms/send` |
| Recipient | `MANAGER_PHONE` (E.164, e.g. `+2348100653664`) |
| Sender | `TERMII_SENDER_ID` (registered sender ID) |
| Events | `reservation.created`, `payment.verified`, `event.inquiry.created`, `dining.reservation.created` |
| Demo | `NOTIFY_CHANNEL=console` logs body to server stdout |

**Delivery KPI:** ≥95% — measure via Termii dashboard + app logs; retry queue in Phase 4.

## 5. WhatsApp (launch requirement)

| Item | Detail |
|------|--------|
| Status | Required at launch per ADR-003; implement in Agent F |
| Options | Termii WhatsApp API (preferred if same vendor), Meta WhatsApp Cloud API |
| Env | `NOTIFY_CHANNEL=both`; `WHATSAPP_*` provider keys TBD in POC |
| KPI | ≥95% delivery on at least one channel; log both attempts |

## 5a. RAYZA Connect (third-party channel relay)

**Purpose:** Keep a partner channel-manager SaaS (RAYZA Connect, at `cloud-relay-nu.vercel.app`) aware of Relief's own bookings, so other channels it powers don't double-sell a room Relief already confirmed. See `ADR-006-rayza-connect-channel.md`.

| Item | Detail |
|------|--------|
| Contract reference | Live `/openapi.json` on the relay — this is a third-party API we don't own; the local stub must track it, not the other way round |
| Trigger | Staff confirms a reservation → `POST /v1/bookings`; staff cancels → `POST /v1/bookings/{ref}/cancel` |
| Auth | `Authorization: Bearer {RAYZA_API_KEY}` |
| Room identifier | Relief's own room `id` (e.g. `signature-suite`), sent as-is — RAYZA has no separate catalog to map against |
| Amount | Naira amount from the matched successful `PaymentRecord`, omitted if unpaid |
| Idempotency | Same `booking_reference` re-POSTed → `already_received` (not an error); cancelling an already-gone reference → 404, treated as success |
| Feature flag | `RAYZA_CONNECT_ENABLED=true` + `RAYZA_API_KEY` (unset → sync silently skipped) |
| Direction | **Outbound only.** Relief does not currently pull bookings created on other RAYZA-connected channels back into its own store — Relief's in-house HMS (separate `agent-*` workstream) is the intended system of record longer-term. |

## 6. Hosting & DNS

| Environment | Integration |
|-------------|-------------|
| Local | No external host; optional ngrok |
| Demo | ngrok → dev server; update Paystack + `NEXT_PUBLIC_APP_URL` |
| Production | **Netlify** → custom domain (Notigori DNS per stakeholder) |

**SSL:** Terminated at host edge; force HTTPS.

## 7. Database (production)

| Item | Detail |
|------|--------|
| Provider | Supabase Postgres (ADR-001) |
| Access | Server-only `DATABASE_URL` |
| Migration | Replace `fs` reads/writes in `demo-store` / `inquiry-store` with SQL |
| Connection | Pool from Route Handlers; no DB from browser |

## 8. Internal integration: notification bus (logical)

Not a separate service today — synchronous call from each Route Handler:

```text
API Handler → notifyManager(payload) → Termii | console
```

Future: outbox table + worker or queue (Netlify scheduled functions / cron).

## 9. Error handling contract (cross-cutting)

| Integration | On failure |
|-------------|------------|
| Paystack init | 502 + message; do not create payment row |
| Paystack verify | 400/502; user sees callback error state |
| Resend | Log; reservation still saved; `emailSent: false` |
| Termii | Log; reservation still saved; `notifyResult.sent: false` |
| RAYZA Connect | Log `{ok:false, error}`; reservation status change still succeeds — never blocks staff on a secondary channel |
| File store (demo) | 500; rare on local disk |

**Principle:** Never lose the booking record because a secondary channel failed.

## 10. Versioning

- Public HTTP API: **v1** (path `/api/*`, no version prefix)  
- Breaking changes require new contract doc `api-v2.md` + migration window
