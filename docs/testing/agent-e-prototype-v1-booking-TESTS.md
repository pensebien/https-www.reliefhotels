# Test handoff — Agent E (Prototype V1 — Core Booking)

**Prototype:** `project-context/01-prototyping/prototype-experiments/prototype-v1/`  
**Branch:** `features/agent-e-prototype-v1-booking`  
**Business KPIs:** Paid bookings path, booking reliability ≥98%, website readiness

## Scope delivered

- Home → Rooms → Book → Paystack/demo callback
- Deposit calculation (20% × nights)
- Payment success page with reference
- Contact reservation form (concierge path)

## Automated checks

- [ ] `npm run lint` — PASS / FAIL
- [ ] `npm run build` — PASS / FAIL

### Commands run

```bash
cd reliefhotels
npm run lint
npm run build
```

## Manual QA

### Preconditions

- `npm run dev` running
- ngrok URL shared OR `http://localhost:3000`
- `.env.local` has `NEXT_PUBLIC_APP_URL` matching public URL (for Paystack)

### Steps

1. Open `/en` — confirm hero, stats, experiences load (no blank page).
2. Go to `/rooms` — open Signature Suite — click **Pay deposit online**.
3. On `/book`, enter email `test@example.com`, set nights = 2, click **Pay deposit with Paystack** OR **Quick test ₦5,000**.
4. Complete Paystack test card OR demo redirect — land on `/payment/callback` with success.
5. Submit homepage contact form with valid data — see success message.
6. Open `/demo`, key `relief-demo-2026` — confirm new reservation/payment appears.

### Expected outcomes

- No React child/function errors on homepage
- Book flow reaches success within 3 minutes
- Demo dashboard shows live submission
- Mobile: repeat steps 1–3 on phone width

## Phase 0 alignment

| KPI | Validated? |
|-----|------------|
| 20 bookings/month path exists | Yes if payment completes |
| Secure booking | HTTPS on ngrok; Paystack test |
| Functional website | Core pages load |

## Sign-off

- [ ] Agent: automated checks passed
- [ ] QA: manual steps passed
- [ ] Ready to merge

## Blockers / follow-ups

- File-based store not durable on serverless hosts — note for Phase 2 architecture
