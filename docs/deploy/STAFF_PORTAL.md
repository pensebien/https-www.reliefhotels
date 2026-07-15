# Staff Portal — subdomain setup

Kalu’s **staff portal** runs on the **same Next.js app** as the public site. The subdomain gives an ops-focused entry point without a separate deploy.

**Production URL:** `https://reservation.reliefhotelsandsuites.com?key=YOUR_DEMO_DASHBOARD_KEY`

**Legacy (still works):** `https://reliefhotelsandsuites.com/en/demo?key=…`

---

## What the subdomain does

| Request on `reservation.…` | Behaviour |
|----------------------------|-----------|
| `/` | Staff dashboard (reservations + payments) |
| `/demo` | Redirects to staff portal |
| `/rooms`, `/book`, etc. | Redirects to main site |
| `/api/*` | Same API (unchanged) |

Staff portal uses a **dedicated layout**: no marketing header/footer, no demo banner, `noindex` for search engines.

---

## Step 1 — DNS (registrar or Cloudflare)

Add a record for the subdomain:

| Host | Type | Value |
|------|------|--------|
| `reservation` | CNAME | `your-site.netlify.app` |

*(Use the exact target Netlify shows under Domain management.)*

Wait until DNS propagates (often 15 minutes–48 hours).

---

## Step 2 — Netlify domain

1. **Site configuration → Domain management → Add a domain**
2. Enter `reservation.reliefhotelsandsuites.com`
3. Confirm **Verified** + SSL active

---

## Step 3 — Environment variable

**Site configuration → Environment variables → Production**

| Key | Value |
|-----|--------|
| `STAFF_PORTAL_HOST` | `reservation.reliefhotelsandsuites.com` |

Optional: comma-separated list for staging, e.g.  
`reservation.reliefhotelsandsuites.com,reservation-staging.netlify.app`

Redeploy after saving.

---

## Step 4 — Share with Kalu

```
https://reservation.reliefhotelsandsuites.com?key=relief-demo-2026
```

Rotate `DEMO_DASHBOARD_KEY` periodically; treat the URL like a password.

---

## Local development

1. Add to `/etc/hosts`:

   ```
   127.0.0.1 reservation.localhost
   ```

2. In `.env.local`:

   ```
   STAFF_PORTAL_HOST=reservation.localhost
   PORT=3002
   ```

3. Run `npm run dev` and open:

   ```
   http://reservation.localhost:3002/?key=relief-demo-2026
   ```

Without the subdomain locally, use:

```
http://localhost:3002/en/staff?key=relief-demo-2026
```

---

## Security notes

- Subdomain **does not replace** the dashboard key — still required.
- For stronger protection later: Netlify password protection on the subdomain, or Phase C+ staff login.
- Portal pages set `robots: noindex`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Subdomain shows main homepage | DNS not on Netlify yet, or redeploy needed after `STAFF_PORTAL_HOST` |
| SSL pending | Wait for Netlify certificate; confirm CNAME |
| “Invalid dashboard key” | Check `DEMO_DASHBOARD_KEY` on Netlify matches URL |
| `/en/staff` on main site works but subdomain doesn’t | Verify `STAFF_PORTAL_HOST` matches hostname exactly |

See also: [NETLIFY.md](./NETLIFY.md) · [MONIEPOINT.md](./MONIEPOINT.md) (walk-in payments)
