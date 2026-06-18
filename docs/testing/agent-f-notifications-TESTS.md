# Test handoff — Agent F (Prototype V3 — Notifications)

**Prototype:** `project-context/01-prototyping/prototype-experiments/prototype-v3/`  
**Branch:** `features/agent-f-notifications`  
**POC plan:** `project-context/01-prototyping/validation-reports/notification-poc-plan.md`  
**Business KPI:** Manager notification delivery **≥ 95%**

## Scope delivered

- `src/lib/notifications.ts` — `notifyManager()`
- **Manager SMS/WhatsApp:** only `/api/paystack/verify` (`payment.verified`) after successful deposit payment
- Unpaid form submissions (`reservation.created`, event, dining) do **not** trigger SMS/WhatsApp — `isManagerAlertAllowed()` gates to `payment.verified` only
- Env: `MANAGER_PHONE`, `NOTIFY_CHANNEL`, `TERMII_*`, `WHATSAPP_PROVIDER`, `TERMII_WHATSAPP_DEVICE_ID`
- Dual channel: `NOTIFY_CHANNEL=both` (ADR-003)
- Optional audit: `notification_log` table when Supabase enabled

## Automated checks

- [ ] `npm run lint` — PASS / FAIL
- [ ] `npm run build` — PASS / FAIL
- [ ] No secrets in `NEXT_PUBLIC_*` — PASS / FAIL

### Commands run

```bash
npm run lint
npm run build
rg "TERMII_API_KEY|sk_test" src/ --glob "*.tsx"
```

## Manual QA — Demo mode (no Termii)

### Preconditions

```env
NOTIFY_CHANNEL=console
MANAGER_PHONE=+2348033262719
# TERMII_API_KEY unset
```

1. Restart `npm run dev`.
2. Submit contact reservation — **no** manager SMS/WhatsApp; API returns `notified: false`.
3. Submit event inquiry — **no** manager SMS/WhatsApp; `notified: false`.
4. Submit dining reservation — **no** manager SMS/WhatsApp; `notified: false`.
5. Complete payment verify — `[notify:demo]` or live send with deposit summary; API returns `notified: true` when Termii/Meta delivers.

**Expected:** Only `payment.verified` (post-payment) logs `[notify:demo]` / sends SMS or WhatsApp. Unpaid forms must not alert the manager. Guest payment callback shows manager confirmation when `notified: true`.

## Manual QA — Live SMS (Termii)

### Preconditions

```env
NOTIFY_CHANNEL=sms
MANAGER_PHONE=+234803xxxxxxx
TERMII_API_KEY=your_key
TERMII_SENDER_ID=Relief
```

Run **10 tests** per `notification-poc-plan.md` — record delivery count.

| Test # | Trigger | SMS received? |
|--------|---------|---------------|
| 1 | Payment success (deposit) | |
| 2 | Payment success (repeat) | |
| … | (repeat to 10) | |

**Note:** Reservation, event, and dining form submits must **not** send SMS/WhatsApp — only `payment.verified`.

**Pass:** ≥ 9/10 payment verifications received (95%).

## Sign-off

- [ ] Agent: automated checks passed
- [ ] QA: demo mode logs verified
- [ ] QA: live SMS ≥95% OR documented blocker
- [ ] Ready to merge (merge **last** after E-v1, E-v2)

## Manual QA — WhatsApp (`NOTIFY_CHANNEL=both`)

```env
NOTIFY_CHANNEL=both
WHATSAPP_PROVIDER=termii
TERMII_WHATSAPP_DEVICE_ID=your_device_id
```

1. Complete payment verify — expect SMS and/or WhatsApp per Termii dashboard.
2. **Pass (launch):** ≥95% on at least one channel for `payment.verified` only (9/10 tests).

## Blockers / follow-ups

- Termii WhatsApp device + template approval from Termii dashboard
- Meta alternative: set `WHATSAPP_PROVIDER=meta` + `META_WHATSAPP_*`
