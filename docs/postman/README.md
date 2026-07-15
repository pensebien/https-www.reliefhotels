# Relief Hotels — Postman API collection

Postman assets for exercising the **RAYZA Connect** SaaS relay and the **Relief Hotels** website API.

## Files

| File | Purpose |
|------|---------|
| `Relief-Hotels-API.postman_collection.json` | Collection v2.1 with all requests, tests, and example bodies |
| `Relief-Hotels-Production.postman_environment.json` | Production base URL and chained variables |
| `Relief-Hotels-Local.postman_environment.json` | Local dev (`http://localhost:3012`) |

## Import into Postman

### Desktop or web app

1. Open Postman.
2. Click **Import** (top-left).
3. Drag in (or browse to) these files from `docs/postman/`:
   - `Relief-Hotels-API.postman_collection.json`
   - `Relief-Hotels-Production.postman_environment.json` (and/or `Relief-Hotels-Local.postman_environment.json`)
4. Confirm import.

### Select an environment

1. Use the environment dropdown (top-right).
2. Choose **Relief Hotels — Production** for live testing, or **Relief Hotels — Local (3012)** for local dev.
3. Click the eye icon → **Edit** to set secrets (see below).

## Required secrets

| Variable | Where to set | Used by |
|----------|--------------|---------|
| `rayza_api_key` | Collection variables (or environment) | RAYZA Connect folder |
| `dashboard_key` | Environment | Staff / HMS, Moniepoint, room-blocks |

Collection defaults are safe placeholders — replace before calling protected endpoints.

## Collection structure

### 1. RAYZA Connect (SaaS relay)

Base URL: `https://cloud-relay-nu.vercel.app` (`rayza_base_url`)

| Request | Notes |
|---------|-------|
| Create booking (test mode) | `is_test: true`; auto-generates `rayza_booking_reference` |
| Create booking (live) | `is_test: false` |
| List pending / cancelled bookings | Query `status=pending` or `status=cancelled` |
| Cancel booking | Uses saved `rayza_booking_reference` |
| Negative: missing auth | Expect **422** |
| Negative: missing required fields | Expect **422** |
| GET OpenAPI spec / Swagger UI | `/openapi.json`, `/docs` |

**Chaining:** Create-booking requests run a pre-request script to generate a unique reference, then save it to the environment on `201` via:

```javascript
const ref = body.booking_reference || pm.variables.get('rayza_booking_reference');
pm.environment.set('rayza_booking_reference', ref);
```

### 2. Relief Hotels API

Base URL: `relief_base_url` (production: `https://reliefhotelsandsuites.com`)

| Folder | Endpoints |
|--------|-----------|
| Health & config | `GET /api/health` — asserts `productionReady` |
| Room availability (Tier 2) | `GET /api/rooms/availability` |
| Guest booking flow | `POST /api/reservations` → `POST /api/paystack/initialize` → `GET /api/paystack/verify?demo=1` |
| Inquiries | event, dining, feedback |
| Staff / HMS (Tier 1) | activity, walk-in reservations, PATCH confirm/cancel/notes |
| Staff inventory (Tier 2) | room-blocks CRUD |
| Moniepoint | payment status poll |

**Chaining:** Guest and staff flows save `reservation_id` and `payment_reference` automatically in test scripts so later requests work in sequence.

## Recommended test flows

### Guest booking (demo payment)

1. `GET /api/health`
2. `GET /api/rooms/availability`
3. `POST /api/reservations`
4. `POST /api/paystack/initialize`
5. `GET /api/paystack/verify?demo=1`

### RAYZA relay

1. **Create booking (test mode)**
2. **List pending bookings**
3. **Cancel booking**

### Staff walk-in

1. `POST /api/demo/reservations (walk-in cash)`
2. `GET /api/demo/activity`
3. `PATCH — confirm` / `PATCH — staff notes`

## Variables reference

| Variable | Default (collection) | Description |
|----------|---------------------|-------------|
| `rayza_base_url` | `https://cloud-relay-nu.vercel.app` | RAYZA relay host |
| `rayza_api_key` | *(placeholder)* | API key in `authorization` header |
| `rayza_booking_reference` | `RH-RAYZA-TEST-001` | Set by create-booking scripts |
| `rayza_room_identifier` | `SIGNATURE_SUITE` | Room code for RAYZA |
| `relief_base_url` | `https://reliefhotelsandsuites.com` | Relief Hotels API host |
| `dashboard_key` | `relief-demo-2026` | Staff dashboard query param |
| `check_in` / `check_out` | `2026-09-10` / `2026-09-12` | Stay dates (`YYYY-MM-DD`) |
| `guest_email` | `guest.test@example.com` | Guest / Paystack email |
| `room_id` | `signature-suite` | Relief room slug |
| `reservation_id` | *(empty)* | Chained from reservation create |
| `payment_reference` | *(empty)* | Chained from Paystack init or walk-in |
| `block_id` | *(empty)* | Chained from room-block create |

## Notes

- **Tier 2 / planned endpoints:** `PATCH /api/demo/reservations/{id}` and `/api/staff/room-blocks` are included for HMS work-in-progress; they may return 404 until implemented.
- **Demo payments:** Use `demo=1` on Paystack verify when `DEMO_MODE` is enabled or Paystack keys are absent.
- **Room IDs:** Valid slugs include `guest-room`, `executive-room`, `signature-suite`, `presidential-suite`, `executive-spa`.
