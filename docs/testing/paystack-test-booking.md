# Paystack test booking — cashier + customer

Auth: [Paystack Authentication](https://paystack.com/docs/api/authentication/) — every API call uses:

```http
Authorization: Bearer sk_test_…
```

Secret keys stay in env (`PAYSTACK_SECRET_KEY`). Public key (`pk_test_…`) is for Inline/mobile only; our checkout uses server initialize + hosted page.

## Dashboard (Test mode)

| Field | Value |
|-------|--------|
| Test Public Key | → `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` |
| Test Secret Key | → `PAYSTACK_SECRET_KEY` |
| **Test Callback URL** | `https://www.reliefhotelsandsuites.com/payment/callback` |
| Test Webhook URL | leave empty (not implemented) |
| IP whitelist | leave empty for local/dev |

Do **not** set callback to `reservation.reliefhotelsandsuites.com` (staff only) or bare homepage.

Local `.env.local`:

```env
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_…
PAYSTACK_SECRET_KEY=sk_test_…
NEXT_PUBLIC_APP_URL=http://localhost:3002
# DEMO_MODE must NOT be true when you want real Paystack test checkout
```

## Automated tests

```bash
# Auth helper + cashier cash settle + customer demo verify
npm run test:paystack

# Also call Paystack test API (Bearer auth + transaction/initialize)
npm run test:paystack -- --live
```

Order of cases:

1. **Cashier** — create reservation → `POST /api/staff/cashier/settle` with `cash`
2. **Customer** — create reservation → initialize → verify (`demo=1` or live Paystack URL)
3. **Live (optional)** — `GET /balance` auth probe + real `transaction/initialize`

## Manual QA

### A — Cashier (front desk)

1. Open `http://localhost:3002/en/staff/cashier?key=relief-demo-2026`  
   (or `https://reservation.reliefhotelsandsuites.com/en/staff/cashier?key=…`)
2. **Settle deposit** → pick pending guest → Cash → Settle  
3. Confirm reservation becomes confirmed in staff inbox

Paystack Terminal on cashier needs `PAYSTACK_TERMINAL_ID` + test/live terminal hardware. Without it, use **Cash** for desk QA.

### B — Customer (online)

1. `http://localhost:3002/en/rooms` → room → Pay deposit  
2. Complete checkout → Paystack hosted page  
3. Test card: `4084084084084081` · CVV any · future expiry · PIN `0000` · OTP `123456`  
4. Land on `/payment/callback` → success  
5. Check staff portal / demo dashboard for payment row

## Security gates (business case — paid bookings KPI)

- `demo=1` on `/api/paystack/verify` **only** works when `DEMO_MODE=true` or Paystack keys are missing/invalid. With real `sk_test_`/`sk_live_` keys, demo bypass is rejected.
- `demoAmountNgn` is rejected outside demo mode (prevents ₦1 fake deposits).
- Cashier suggested amount = **20% deposit** (same as online), not full stay.
- `/api/health` exposes `demoMode` + `paystackMode` so ops can spot silent simulation.

## Production note

Use `pk_live_` / `sk_live_` only on production. Keep Test Callback URL for test mode; Live Callback URL the same path on www.  
**Never** set `DEMO_MODE=true` on production.
