# Moniepoint — front-desk payments setup

Walk-in reservations on the **staff portal** can record deposits via:

| Method | How it works |
|--------|----------------|
| **Cash** | Staff records cash received; reservation confirmed immediately. |
| **Moniepoint terminal** | App pushes amount to the POS; guest pays on device; reservation confirms when Moniepoint reports success. |
| **Moniepoint bank transfer** | App registers transfer with Moniepoint API; guest transfers to hotel account; payment auto-confirmed via polling + webhook. |
| **No deposit yet** | Reservation stays pending (guest pays online via Paystack later). |

**Online guest bookings** still use **Paystack only** — Moniepoint is for front-desk / walk-in.

**Staff portal:** `https://reservation.reliefhotelsandsuites.com?key=YOUR_DEMO_DASHBOARD_KEY`  
See also: [STAFF.md](./STAFF.md)

---

## Prerequisites

1. Active **Moniepoint business account** with a registered POS terminal.
2. Terminal app version **1.7.2 or higher** on the device.
3. **ERP integration** enabled in Moniepoint (see Step 2 below).
4. API **client ID + secret** generated from Moniepoint dashboard.
5. Production app deployed with **Supabase** (payments must persist).

Official API reference: [Push Payment Request (Moniepoint)](https://teamapt.atlassian.net/wiki/spaces/EI/pages/1039826999/Push+Payment+Request+API+Reference)

Moniepoint support (integrations): `pos-integrations@moniepoint.com`

---

## Step 1 — Supabase migration

Apply the payment-method columns (if not already applied):

```bash
# In Supabase SQL Editor, run:
docs/supabase/migration-004-payment-method.sql
```

This adds `payment_method`, `payment_channel`, and `external_reference` to the `payments` table.

---

## Step 2 — Moniepoint dashboard

### 2a. Enable ERP / API integration

1. Log in to **Moniepoint Business**.
2. Go to **POS terminal configuration** → **POS Terminal features**.
3. Enable **ERP integration** (required for push-to-terminal API).
4. Note your terminal **serial number** (e.g. `P260xyz`) — shown on the device or in the dashboard.

### 2b. Create API credentials

1. Open **Account settings** → **API / Developer** (or Integrations).
2. Create a new **API client** (client ID + client secret).
3. Store the secret securely — it is shown once.

### 2c. Webhook (recommended for production)

Subscribe to transaction events so the app confirms payments without relying only on polling:

| Setting | Value |
|---------|--------|
| **Webhook URL** | `https://reliefhotelsandsuites.com/api/moniepoint/webhook` |
| **Events** | `V1_POS_TRANSFER_TRANSACTION`, `V1_TRANSFER_TRANSACTION`, and POS purchase events |

Use your real production domain. If the staff portal is on a subdomain, the API still lives on the main site — webhook URL should point to wherever the Next.js app is hosted.

After saving, redeploy Netlify so the route is live.

---

## Step 3 — Environment variables

Add to **Netlify → Site configuration → Environment variables → Production** (and `.env.local` for local testing).

| Variable | Required | Description |
|----------|----------|-------------|
| `MONIEPOINT_CLIENT_ID` | Terminal + API | API client ID from Moniepoint |
| `MONIEPOINT_CLIENT_SECRET` | Terminal + API | API client secret (server only) |
| `MONIEPOINT_TERMINAL_SERIAL` | Terminal | POS serial, e.g. `P260xyz` |
| `MONIEPOINT_BASE_URL` | Optional | Default: `https://channel.moniepoint.com` |
| `MONIEPOINT_TRANSFER_BANK_NAME` | Transfer UI | e.g. `Moniepoint` |
| `MONIEPOINT_TRANSFER_ACCOUNT_NAME` | Transfer UI | e.g. `Relief Hotels & Suites` |
| `MONIEPOINT_TRANSFER_ACCOUNT_NUMBER` | Transfer UI | Hotel Moniepoint account number |

**Example `.env.local`:**

```env
MONIEPOINT_CLIENT_ID=your-client-id
MONIEPOINT_CLIENT_SECRET=your-client-secret
MONIEPOINT_TERMINAL_SERIAL=P260xxxxxxxx
MONIEPOINT_BASE_URL=https://channel.moniepoint.com
MONIEPOINT_TRANSFER_BANK_NAME=Moniepoint
MONIEPOINT_TRANSFER_ACCOUNT_NAME=Relief Hotels & Suites
MONIEPOINT_TRANSFER_ACCOUNT_NUMBER=1234567890
```

Redeploy after any env change.

---

## Step 4 — How each payment method behaves

### Cash

1. Staff opens staff portal → **New walk-in booking**.
2. Fill guest details, room, dates.
3. Under **Deposit payment method**, select **Cash**.
4. Save → payment recorded as `RH-CASH-…`, reservation **confirmed**.

### Moniepoint terminal

1. Select **Moniepoint terminal** as payment method.
2. Save → app calls Moniepoint `POST /v1/transactions` with deposit amount (20% of stay).
3. Dialog shows **Waiting for terminal payment** — amount appears on the POS.
4. Guest completes card or on-terminal transfer on the device.
5. App confirms via **polling** (`/api/demo/payments/{reference}/status`) and/or **webhook**.
6. On success → payment `success`, reservation **confirmed**.

Payment references use prefix `RH-MPOS-…` (also used as `merchantReference` in Moniepoint).

### Moniepoint bank transfer

1. Select **Moniepoint bank transfer** and save.
2. App creates a **pending** payment (`RH-MPTF-…`) and calls Moniepoint `POST /v1/transactions` with `paymentMethod: POS_TRANSFER` so the platform expects the incoming transfer.
3. Dialog shows hotel **account details** and a payment reference (guest may paste reference in transfer narration — optional).
4. Guest transfers the deposit from their bank app to the hotel Moniepoint account.
5. Moniepoint reports the transfer → app confirms via:
   - **Polling** — `GET /api/demo/payments/{reference}/status?key=…` (every few seconds in the UI)
   - **Webhook** — `POST /api/moniepoint/webhook` on events `V1_POS_TRANSFER_TRANSACTION` / `V1_TRANSFER_TRANSACTION`
6. On success → payment `success`, reservation **confirmed**. **No manual reference entry** by staff.

If the webhook payload does not include our reference, the server can match a pending transfer by **exact deposit amount** (most recent pending `moniepoint_transfer` payment).

---

## Step 5 — Demo / test mode (no live credentials)

If `MONIEPOINT_CLIENT_ID`, `MONIEPOINT_CLIENT_SECRET`, or `MONIEPOINT_TERMINAL_SERIAL` are missing — or `DEMO_MODE=true` — terminal payments run in **demo mode**:

- Push is logged to server console (`[moniepoint:demo]`).
- Status poll returns **approved** immediately.
- Safe for training staff on the walk-in form without a physical terminal.

```bash
npm run dev
# Open staff portal with dashboard key
http://localhost:3002/en/staff?key=relief-demo-2026
```

---

## Step 6 — Production smoke test

| # | Check | Expected |
|---|--------|----------|
| 1 | Staff portal loads with dashboard key | Calendar + **New walk-in booking** button |
| 2 | Create booking — **Cash** | Reservation confirmed; payment `RH-CASH-…` in list |
| 3 | Create booking — **Moniepoint terminal** | POS receives amount; after guest pays, reservation confirms |
| 4 | Create booking — **Moniepoint transfer** | Pending → auto-confirmed when transfer detected (`RH-MPTF-…`) |
| 5 | Payment row shows method label | Cash / Moniepoint terminal / Moniepoint transfer |
| 6 | Supabase `payments` row | `payment_method` and `payment_channel` populated |

---

## API routes (reference)

| Route | Purpose |
|-------|---------|
| `POST /api/demo/reservations?key=…` | Create walk-in reservation + payment |
| `GET /api/demo/payments/{reference}/status?key=…` | Poll Moniepoint terminal status |
| `POST /api/moniepoint/webhook` | Moniepoint transaction webhook |
| `GET /api/demo/activity?key=…` | Dashboard data + `moniepoint.transferAccount` for UI |

All staff routes require the same `DEMO_DASHBOARD_KEY` as the dashboard.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Terminal push fails (401) | Invalid client ID/secret | Regenerate credentials in Moniepoint; update Netlify env |
| Terminal push fails (400) “Transaction exists” | Duplicate `merchantReference` | Rare — retry; reference is unique per booking |
| Amount not on POS | ERP integration disabled | Enable in POS Terminal features |
| Transfer account not shown | Env vars missing | Set `MONIEPOINT_TRANSFER_ACCOUNT_*` |
| Payment stuck pending | Guest cancelled on terminal | Staff creates new booking or switches to cash |
| Webhook not firing | Wrong URL or not subscribed | Confirm URL in Moniepoint portal; check Netlify function logs |
| Works locally, not on Netlify | Env not set on Production | Add vars → **Trigger deploy** |

---

## Security notes

- Never commit `MONIEPOINT_CLIENT_SECRET` to Git.
- Rotate API client secret if exposed.
- Treat the staff portal URL + `DEMO_DASHBOARD_KEY` like a password.
- Webhook endpoint is public — rely on Moniepoint signature/secret configuration when available in your Moniepoint portal.

---

## Related docs

- [STAFF.md](./STAFF.md) — subdomain, HMS surfaces, cashier
- [NETLIFY.md](./NETLIFY.md) — deploy and env vars
- [ENV_MATRIX.md](../ENV_MATRIX.md) — full environment variable matrix
- [reservation-qa-checklist.md](../testing/reservation-qa-checklist.md) — QA sign-off
