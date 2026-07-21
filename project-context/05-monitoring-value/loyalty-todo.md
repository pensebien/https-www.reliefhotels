# Loyalty program — TODO (not in current build)

**Status:** Backlog only  
**Created:** 2026-07-16  
**Traces to:** `00-business-context/business-case.md` (future CRM / loyalty)

## Why later

Current wave delivers light HMS (F&B folio, roles, accounting, calendar). Loyalty needs identity, points ledger, and rate rules beyond the N2m launch envelope.

## TODO checklist (future sprint)

- [ ] Define member tiers (e.g. Relief Member / Silver / Gold) and earn rules (₦ spent → points)
- [ ] Schema: `loyalty_members`, `loyalty_ledger` (earn/burn), link to `reservations.email`
- [ ] Guest opt-in on `/book` + staff enroll on walk-in
- [ ] Redeem points at cashier settle / F&B folio pay
- [ ] Member rate codes on availability (optional)
- [ ] ADR + API contract before coding
- [ ] i18n: en, fr, pcm

## Dependencies

- Stable folio + payments (HMS Phase 2–3)  
- Prefer real staff auth before member PII at scale  

## Do not start until

Sponsor (Kalu) prioritizes loyalty over PMS / WhatsApp POC.
