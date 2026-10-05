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
| RAYZA Connect (RAYZA HMS relay) | Two-way: availability in, bookings out | HTTPS REST | Bearer API key | Pilot |

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
| Recipient | `MANAGER_PHONE` (E.164, e.g. `+2349124784058`) |
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

## 5a. RAYZA Connect (RAYZA HMS relay, API v4.2)

**Purpose:** Two-way inventory with the hotel's RAYZA HMS via its Cloud Relay (`cloud-relay-nu.vercel.app`). RAYZA holds the whole house (front-desk bookings, HMS blocks); Relief stays the guest-facing booking engine. See `ADR-006-rayza-connect-channel.md`. Code: `src/lib/integrations/rayza-connect.ts` (HTTP + payloads), `rayza-sync.ts` (orchestration).

| Item | Detail |
|------|--------|
| Contract reference | Live `/openapi.json` + docs page on the relay (v4.2.0, checked 2026-10-05) |
| Room types | Staff link each Relief room type to a RAYZA `room_type_identifier` (Staff → Channels → RAYZA HMS). Unlinked types aren't synced. "Use RAYZA's room numbers" copies RAYZA's numbers and count into room setup |
| Availability | `GET /v1/rooms?check_in&check_out`: a room sells only when Relief **and** RAYZA have one free, RAYZA's min stay / closed-to-arrival / departure and max occupancy apply. Search uses a 30 s cache; the booking write path re-checks live. RAYZA unreachable → Relief inventory alone (fail-open, logged) |
| Booking | On confirmation (payment, staff confirm, walk-in, cashier) → `POST /v1/bookings`, one per room, every line of a group. Sends amount (required), deposit, payment status, adults, assigned room number when RAYZA knows it. `409` with a room number → retried without it |
| References | `BK-RH-<12 hex of reservation id>[-n]`. RAYZA rewrites references not starting with `BK-` (e.g. `RH-AB12` → `BK-AB12`), which made pre-v4.2 cancels 404 silently. The reference RAYZA returns is stored |
| Cancel | Staff cancel and guest self-cancel → `POST /v1/bookings/{ref}/cancel` for each stored ref. `200` (cancelled / already_cancelled) = done; `404` = RAYZA never had it |
| Room move | Staff assign/move → `PATCH /v1/bookings/{ref}` `{room_number}` |
| Sync status | `rayza_sync` table (migration 022; JSON file in file mode): pushed / cancelled / failed per reservation. A refusal (e.g. `ROOM_UNAVAILABLE`, `OCCUPANCY_LIMIT_EXCEEDED`) is noted once on the booking's staff notes |
| Retry | Netlify `rayza-sync` every 15 min → `/api/cron/rayza` (`CRON_SECRET`); "Sync now" on the Channels page retries everything. Only bookings made after a room type was linked are backfilled |
| Feature flag | `RAYZA_CONNECT_ENABLED=true` + `RAYZA_API_KEY` |
| Known relay quirk | `GET /v1/rooms` without dates lists only rooms free **today** (docs say all rooms); the client fills the rest from nights far ahead |

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
