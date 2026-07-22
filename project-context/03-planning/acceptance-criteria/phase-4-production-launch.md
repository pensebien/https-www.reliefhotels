# Acceptance Criteria — Phase 4 Production Launch

**Target host:** Netlify (ADR-004)  
**Database:** Supabase (ADR-001)  
**Alerts:** SMS + WhatsApp (ADR-003)  
**Traceability:** `../02-architecture/security-requirements.md` pre-production checklist

---

## Infrastructure

- [ ] Netlify service deployed from `main`
- [ ] Custom domain DNS points to Netlify (Notigori)
- [ ] HTTPS enforced; `NEXT_PUBLIC_APP_URL` = production URL
- [ ] `DATABASE_URL` (Supabase) set on Netlify
- [ ] All production env vars per `docs/ENV_MATRIX.md` production row

---

## Integrations (live)

- [ ] Paystack **live** keys; test charges verified once
- [ ] Paystack callback URL = `{APP_URL}/payment/callback`
- [ ] Resend verified sender domain
- [ ] Termii SMS live — ≥95% on 20-sample POC
- [ ] WhatsApp live — business verification complete
- [ ] `NOTIFY_CHANNEL=both` in production

---

## Application

- [ ] Critical journeys pass smoke test (home, rooms, book, pay, events, dine-wine, gallery)
- [ ] 100% reservation writes in Supabase (no file-store dependency)
- [ ] `/demo?key=` works with rotated production key (sponsor decision)
- [ ] `DEMO_MODE` not enabled in production
- [ ] Privacy policy linked (footer) — NFR-C3

---

## Operations

- [ ] `05-monitoring-value/operations-runbooks/manager-notifications.md` rehearsed with hotel manager
- [ ] `RESERVATION_EMAIL` monitored by reservations team
- [ ] Escalation path documented if SMS/WhatsApp fails

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Tech Lead | | |
| Executive Sponsor (Kalu) | | |
| Operations | | |

After sign-off → begin `05-monitoring-value/value-realization-reports/month-1-report.md`.
