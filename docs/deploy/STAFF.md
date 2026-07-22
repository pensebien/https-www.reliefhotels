# Staff portal — subdomain, HMS surfaces, cashier

Same Next.js app as the public site. The subdomain is an ops entry point (no separate deploy).

**Production:** `https://reservation.reliefhotelsandsuites.com?key=YOUR_DEMO_DASHBOARD_KEY`  
**Legacy:** `https://reliefhotelsandsuites.com/en/demo?key=…`  
**Roadmap:** `project-context/03-planning/hms-expansion-roadmap.md`  
**Cashier ADR:** `project-context/02-architecture/architecture-decision-records/ADR-005-cashier-dual-pos.md`

---

## Subdomain behaviour

| Request on `reservation.…` | Behaviour |
|----------------------------|-----------|
| `/` | Staff dashboard (reservations + payments) |
| `/demo` | Redirects to staff portal |
| `/rooms`, `/book`, etc. | Redirects to main site |
| `/api/*` | Same API (unchanged) |

Dedicated layout: no marketing header/footer, `noindex`.

---

## HMS surfaces

| Path | Role focus | Purpose |
|------|------------|---------|
| `/staff` | All | Bookings inbox / lists / calendar |
| `/staff/cashier` | Front desk | Settle deposits **or** order F&B |
| `/staff/fnb` | Front desk | Minibar & F&B folio (search + paginated list) |
| `/staff/calendar` | Front desk / manager | Occupancy calendar |
| `/staff/accounting` | Accountant | Payments ledger + CSV |

Role query: `/en/staff?key=YOUR_KEY&role=front_desk|manager|accountant`

### Guest booking

1. Property bar → dates → `/rooms`  
2. Select room → `/book`  
3. `POST /api/reservations` → Paystack deposit → verify → confirmed  

### Front-desk reservation

1. Walk-in on calendar/dashboard **or** guest pending booking  
2. Cashier → **Settle deposit** for unpaid bookings  
3. Cashier → **Order F&B** (or `/staff/fnb`) — search guest → add folio lines  
4. Confirm / cancel / staff notes  

Search by guest name, email, phone, or reservation ID (12 per page).

---

## Cashier (dual POS)

| Method | Provider |
|--------|----------|
| Cash | Local confirm |
| Paystack Terminal | Payment Request + Terminal Event API |
| Moniepoint terminal | POS push |
| Moniepoint transfer | Transfer + poll/webhook |

| Variable | Notes |
|----------|--------|
| `CASHIER_ENABLED` | Expose cashier UI (default on when unset in demo) |
| `PAYSTACK_SECRET_KEY` | Same as online Paystack |
| `PAYSTACK_TERMINAL_ID` | Terminal id for push events |
| `MONIEPOINT_*` | See [MONIEPOINT.md](./MONIEPOINT.md) |
| `DEMO_DASHBOARD_KEY` | Staff auth key |

**URL:** `https://reservation.reliefhotelsandsuites.com/en/staff/cashier?key=…`

Cash settlements may queue offline in IndexedDB (`src/lib/cashier-offline`) and flush with `clientMutationId` idempotency.

---

## DNS & host env

### DNS (registrar or Cloudflare)

| Host | Type | Value |
|------|------|--------|
| `reservation` | CNAME | Your Netlify site target (e.g. `*.netlify.app`) |

### Host env

| Key | Value |
|-----|--------|
| `STAFF_PORTAL_HOST` | `reservation.reliefhotelsandsuites.com` |

Optional comma-separated list for staging. Redeploy after saving.

### Share with ops

```
https://reservation.reliefhotelsandsuites.com?key=relief-demo-2026
```

Rotate `DEMO_DASHBOARD_KEY` periodically; treat the URL like a password.

---

## Local development

1. `/etc/hosts`: `127.0.0.1 reservation.localhost`
2. `.env.local`:

   ```
   STAFF_PORTAL_HOST=reservation.localhost
   PORT=3002
   ```

3. `npm run dev` → `http://reservation.localhost:3002/?key=relief-demo-2026`

Without subdomain: `http://localhost:3002/en/staff?key=relief-demo-2026`

---

## Security

- Subdomain does **not** replace the dashboard key.
- Portal pages set `robots: noindex`.
- Stronger auth (password gate / staff login) can come later.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Subdomain shows main homepage | DNS / host env wrong; redeploy after `STAFF_PORTAL_HOST` |
| SSL pending | Wait for host certificate; confirm CNAME |
| “Invalid dashboard key” | `DEMO_DASHBOARD_KEY` must match URL |
| `/en/staff` works but subdomain doesn’t | Hostname must match `STAFF_PORTAL_HOST` exactly |

See also: [NETLIFY.md](./NETLIFY.md) · [MONIEPOINT.md](./MONIEPOINT.md)

Loyalty: not built — `project-context/05-monitoring-value/loyalty-todo.md`.
