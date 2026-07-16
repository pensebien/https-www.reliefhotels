# Environment Matrix — Relief Hotels

**Last updated:** 2026-06-02  
Use with `.env.example`. Never commit real secrets.

## Summary

| Environment | `NEXT_PUBLIC_APP_URL` | Paystack | Email | Notifications | Data store |
|-------------|-------------------------|----------|-------|---------------|------------|
| **Local** | `http://localhost:3000` | Test or `DEMO_MODE` | Console / Resend test | `console` | `data/*.json` local |
| **ngrok demo** | `https://<id>.ngrok-free.app` | Test keys; callback = same URL | Resend test optional | `console` or Termii test | Local only |
| **Preview** | Hosting preview URL | Test keys | Resend test | `console` recommended | ⚠️ ephemeral on serverless |
| **Production** | `https://www.reliefhotelsandsuites.com` on **Render** | **Live** keys | Resend verified domain | `both` (SMS+WhatsApp) | **Supabase** Postgres |

---

## Local development

```bash
cp .env.example .env.local
npm run dev
```

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `DEMO_DASHBOARD_KEY` | `relief-demo-2026` |
| `DEMO_MODE` | optional `true` |
| `NOTIFY_CHANNEL` | `console` |
| Paystack | Test keys or omit + `DEMO_MODE=true` |

---

## ngrok client demo

1. `ngrok http 3000`
2. Copy **full** URL: `https://xxxx.ngrok-free.app` (not `ngrok-fr`)
3. Set in `.env.local`:

```env
NEXT_PUBLIC_APP_URL=https://xxxx.ngrok-free.app
```

4. Paystack dashboard → Webhook/callback: use same base URL + `/payment/callback`
5. Share `https://xxxx.ngrok-free.app/en` with client

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | Must match ngrok URL exactly |
| `NOTIFY_CHANNEL` | `console` for demos without SMS cost |
| `MANAGER_PHONE` | `+234...` E.164 |

---

## Preview (Netlify / Render)

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | Auto or manual preview URL |
| Paystack | **Test** keys only |
| `NOTIFY_CHANNEL` | `console` until Termii approved |
| File `data/` | Unreliable — do not rely for bookings |

---

## Production

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | Production canonical URL (HTTPS) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Live public key |
| `PAYSTACK_SECRET_KEY` | Live secret (server only) |
| `RESEND_API_KEY` | Production |
| `EMAIL_FROM` | Verified sender domain |
| `RESERVATION_EMAIL` | Hotel inbox |
| `NOTIFY_CHANNEL` | `sms` or `both` |
| `TERMII_API_KEY` | Live |
| `MANAGER_PHONE` | Operations manager |
| `DEMO_DASHBOARD_KEY` | Keep for stakeholder demo; rotate quarterly |
| `MONIEPOINT_*` | Front-desk walk-in (cash / terminal / transfer) — see `docs/deploy/MONIEPOINT.md` |
| `PAYSTACK_TERMINAL_ID` | Front-desk Paystack Terminal push — see `docs/deploy/CASHIER.md` |
| `CASHIER_ENABLED` | Staff cashier module (`true`/`false`) |
| `DATABASE_URL` | Supabase connection string (server only) |
| `WHATSAPP_*` | Provider keys when `NOTIFY_CHANNEL=both` |

**Remove or restrict:** `DEMO_MODE`, public demo key on production routes.

---

## Variable reference

| Variable | Required | Environments |
|----------|----------|----------------|
| `NEXT_PUBLIC_APP_URL` | Yes | All |
| `DEMO_DASHBOARD_KEY` | Demo | Local, ngrok, preview |
| `DEMO_MODE` | Optional | Local, ngrok |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Booking | All with payments |
| `PAYSTACK_SECRET_KEY` | Booking | All with payments |
| `RESEND_API_KEY` | Email | Prod; optional demo |
| `EMAIL_FROM` | Email | With Resend |
| `RESERVATION_EMAIL` | Email | With Resend |
| `MANAGER_PHONE` | Notifications | All |
| `NOTIFY_CHANNEL` | Notifications | All |
| `TERMII_API_KEY` | SMS | Prod / POC |
| `TERMII_SENDER_ID` | SMS | Prod / POC |
| `SUPABASE_URL` | Database | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Database | Production (server only) |
| `TERMII_WHATSAPP_DEVICE_ID` | WhatsApp | Prod / POC |
| `WHATSAPP_PROVIDER` | WhatsApp | `termii` or `meta` |
| `META_WHATSAPP_TOKEN` | WhatsApp | If provider=meta |
| `META_WHATSAPP_PHONE_ID` | WhatsApp | If provider=meta |
| `MONIEPOINT_CLIENT_ID` | Front-desk terminal | Production walk-in |
| `MONIEPOINT_CLIENT_SECRET` | Front-desk terminal | Production (server only) |
| `MONIEPOINT_TERMINAL_SERIAL` | Front-desk terminal | POS serial from Moniepoint |
| `MONIEPOINT_BASE_URL` | Front-desk terminal | Optional; default `https://channel.moniepoint.com` |
| `MONIEPOINT_TRANSFER_ACCOUNT_NAME` | Front-desk transfer | Shown in walk-in form |
| `MONIEPOINT_TRANSFER_ACCOUNT_NUMBER` | Front-desk transfer | Shown in walk-in form |
| `MONIEPOINT_TRANSFER_BANK_NAME` | Front-desk transfer | Optional; default `Moniepoint` |

---

## Checklist before changing environment

- [ ] `NEXT_PUBLIC_APP_URL` matches browser URL
- [ ] Paystack callback URL updated if URL changed
- [ ] Restart dev server after `.env.local` edit
- [ ] Document which matrix row you are on in deploy notes
