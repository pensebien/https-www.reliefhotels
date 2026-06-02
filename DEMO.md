# Relief Hotels — Client Demo Guide (3-hour setup)

Use this script for a **live client demo** of the Relief Hotels website: branding, gallery, reservations, Paystack payments, and the internal dashboard.

---

## 1. Quick start (5 minutes)

```bash
cd reliefhotels
cp .env.example .env.local
npm install
npm run dev
```

Open **http://localhost:3000**

| What works without any API keys | What needs keys |
|--------------------------------|-----------------|
| Full site, gallery, languages | Real Paystack card flow |
| Reservation form → saved locally | Email to inbox (Resend) |
| Simulated Paystack (demo mode) | Live card charges |

**Demo dashboard:** http://localhost:3000/demo  
**Default key:** `relief-demo-2026` (set `DEMO_DASHBOARD_KEY` in `.env.local`)

---

## 2. Paystack test integration (15–20 minutes)

### Step A — Create / open Paystack account

1. Go to [https://dashboard.paystack.com](https://dashboard.paystack.com) and sign up (Nigeria business or test mode).
2. Complete profile enough to access **Test Mode** (toggle in dashboard header).

### Step B — Copy test API keys

1. **Settings → API Keys & Webhooks**
2. Copy **Test Public Key** → `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
3. Copy **Test Secret Key** → `PAYSTACK_SECRET_KEY`
4. Add both to `.env.local`:

```env
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Restart dev server: `npm run dev`

### Step C — Test cards (Paystack docs)

| Card number | Scenario |
|-------------|----------|
| `4084084084084081` | Successful charge |
| `4084084084084085` | Declined |
| `5060666666666666666` | Successful (Verve) |

- **CVV:** any 3 digits  
- **Expiry:** any future date  
- **PIN:** `0000` (if prompted)  
- **OTP:** `123456` (if prompted)

### Step D — Demo payment flows on the site

**Option 1 — Quick ₦5,000 test (recommended on stage)**

1. Go to **Rooms** → pick a suite → **Pay deposit online**
2. On checkout, click **“Quick test — ₦5,000”**
3. If keys are set → Paystack hosted page → use test card above
4. If keys are **not** set → auto-redirect to success (simulated)

**Option 2 — Real deposit math (20% × nights)**

1. Same checkout page → **“Pay deposit with Paystack”**
2. Amount = 20% × nightly rate × number of nights

**Option 3 — Tour payment**

1. **Tours** → **Pay online** → checkout with guest count

### Step E — Callback URL

Paystack redirects to:

`/payment/callback?reference=RH-YYYYMMDD-xxxx`

The app verifies via `GET /api/paystack/verify` and shows success/failure.

For production, set **NEXT_PUBLIC_APP_URL** to your Vercel domain.

---

## 3. Email reservations (10 minutes, optional)

1. Sign up at [https://resend.com](https://resend.com)
2. Create API key → `RESEND_API_KEY`
3. In `.env.local`:

```env
RESEND_API_KEY=re_...
EMAIL_FROM=Relief Hotels <onboarding@resend.dev>
RESERVATION_EMAIL=your-inbox@company.com
```

4. Homepage → **Contact** → submit form  
5. Check inbox + demo dashboard (status shows “✉ sent”)

Without Resend: submissions still appear on **/demo** and in server logs.

---

## 4. Suggested 20-minute client demo script

### Act 1 — Brand & trust (5 min)

| Step | URL | Say |
|------|-----|-----|
| 1 | `/` | Hero video, luxury positioning, Calabar |
| 2 | Scroll stats + experiences | Suites, dining, spa, lounge |
| 3 | Scroll reviews | Social proof (dummy guest quotes) |
| 4 | Language switcher | EN / FR / Pidgin / Igbo / Yorùbá |

### Act 2 — Discovery (5 min)

| Step | URL | Say |
|------|-----|-----|
| 5 | `/gallery` | Filter suites, dining, Calabar — click for lightbox |
| 6 | `/rooms` | Pricing in NGN, amenities |
| 7 | `/tours` | Local guides, Obudu, heritage walk |

### Act 3 — Book & pay (7 min)

| Step | URL | Say |
|------|-----|-----|
| 8 | `/book?type=room&id=presidential-suite` | Secure checkout, deposit model |
| 9 | Click **Quick test — ₦5,000** | Paystack test card live |
| 10 | Success page | Reference + confirmation |
| 11 | `/#contact` | Concierge form for high-touch guests |

### Act 4 — Operations (3 min)

| Step | URL | Say |
|------|-----|-----|
| 12 | `/demo` | Enter key `relief-demo-2026` |
| 13 | Show reservations + payments | Pre-seeded dummy + live entries from demo |
| 14 | Status cards | Paystack / email configuration at a glance |

---

## 5. Dummy data included

Pre-loaded for the dashboard (labelled `source: demo`):

**Reservations**

- Adaeze Okonkwo — Presidential Suite, anniversary  
- James Mbeki — Executive Room, business stay  
- Fatima Bello — Signature Suite, family + tour  

**Payments**

- ₦84,000 presidential deposit (success)  
- ₦25,000 heritage tour (success)  
- ₦5,000 abandoned checkout (shows failed funnel)

**Reviews** — 3 guest quotes on homepage  

**Gallery** — 14 curated Unsplash placeholders by category  

Live submissions during your demo append with `source: live`.

---

## 6. Deploy for client meeting (optional)

```bash
# Vercel
npx vercel

# Add env vars in Vercel project settings (same as .env.local)
# Set NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

Share preview URL + `/demo` key only with internal team.

---

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| Paystack opens then fails | Confirm test keys, `NEXT_PUBLIC_APP_URL` matches browser origin |
| Always simulated payment | Add `PAYSTACK_SECRET_KEY` or unset `DEMO_MODE=true` |
| Email not received | Verify Resend key; check spam; use demo dashboard |
| Dashboard 401 | Use key from `DEMO_DASHBOARD_KEY` (default `relief-demo-2026`) |
| Images slow | Expected with Unsplash; swap URLs in `src/content/site.ts` |

---

## 8. File reference

| File | Purpose |
|------|---------|
| `src/content/site.ts` | Rooms, tours, prices |
| `src/content/gallery.ts` | Gallery images |
| `src/content/demo-data.ts` | Seeded dashboard rows |
| `src/lib/paystack.ts` | Initialize + verify |
| `src/lib/email.ts` | Resend integration |
| `data/demo-store.json` | Live demo submissions (gitignored) |

---

**Good luck with the demo.** For production: replace placeholder images, switch Paystack to **Live** keys, and connect a real PMS or CRM to `/api/reservations`.
