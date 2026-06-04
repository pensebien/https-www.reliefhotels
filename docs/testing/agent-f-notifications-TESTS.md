# Test handoff — Agent F (Prototype V3 — Notifications)

**Prototype:** `project-context/01-prototyping/prototype-experiments/prototype-v3/`  
**Branch:** `features/agent-f-notifications`  
**POC plan:** `project-context/01-prototyping/validation-reports/notification-poc-plan.md`  
**Business KPI:** Manager notification delivery **≥ 95%**

## Scope delivered

- `src/lib/notifications.ts` — `notifyManager()`
- Wired to: `/api/reservations`, `/api/event-inquiries`, `/api/dining-reservations`, `/api/paystack/verify`
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
2. Submit contact reservation — check terminal for `[notify:demo]` with reservation body.
3. Submit event inquiry — `[notify:demo]` with event summary.
4. Submit dining reservation — `[notify:demo]` with venue summary.
5. Complete payment verify — `[notify:demo]` with payment summary.

**Expected:** All four events log; API returns `notified: false` but does not fail guest flow.

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
| 1 | Reservation form | |
| 2 | Event inquiry | |
| 3 | Dining form | |
| 4 | Payment success | |
| … | (repeat to 10) | |

**Pass:** ≥ 9/10 received (95%).

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

1. Trigger reservation — expect SMS and/or WhatsApp per Termii dashboard.
2. **Pass (launch):** ≥95% on at least one channel per event (9/10 tests).

## Blockers / follow-ups

- Termii WhatsApp device + template approval from Termii dashboard
- Meta alternative: set `WHATSAPP_PROVIDER=meta` + `META_WHATSAPP_*`
