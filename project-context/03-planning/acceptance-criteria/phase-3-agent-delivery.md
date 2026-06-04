# Acceptance Criteria — Phase 3 Agent Delivery

**Gate:** Each agent branch merges only when its section is fully checked.  
**Merge order:** A → D → E-v1 → E-v2 → F  
**Reference:** `docs/DELIVERY_PHASED_BUILD_SPEC.md`

---

## Agent A — Platform & environment

- [ ] `.env.example` documents Supabase, WhatsApp, Render-related vars
- [ ] `docs/ENV_MATRIX.md` consistent with `lib/config.ts`
- [ ] `npm run build` passes
- [ ] `docs/testing/agent-a-platform-env-TESTS.md` signed

---

## Agent D — API services

- [ ] All `api-v1.md` endpoints return documented shapes
- [ ] Supabase persistence per ADR-001 (not file-only in production config)
- [ ] Paystack `reference` uniqueness enforced
- [ ] Reservation/inquiry writes survive server restart (DB proof)
- [ ] `npm run build` passes
- [ ] `docs/testing/agent-d-api-services-TESTS.md` signed

---

## Agent E — V1 booking

- [ ] `/en/rooms` → `/en/book` → Paystack/demo payment → callback success path
- [ ] Form validation errors shown inline
- [ ] Mobile layout acceptable at 375px
- [ ] `docs/testing/agent-e-prototype-v1-booking-TESTS.md` signed

---

## Agent E — V2 experiences

- [ ] Event + dining forms submit; records visible in demo dashboard or DB
- [ ] `/events`, `/dine-wine` match brand quality
- [ ] `docs/testing/agent-e-prototype-v2-experiences-TESTS.md` signed

---

## Agent F — V3 notifications

- [ ] All four `NotificationEvent` types trigger `notifyManager`
- [ ] `NOTIFY_CHANNEL=both` attempts SMS and WhatsApp when keys set
- [ ] Console fallback works without keys (demo)
- [ ] Failed secondary channel does not block persistence
- [ ] Delivery logged for KPI measurement
- [ ] `docs/testing/agent-f-notifications-TESTS.md` signed

---

## Wave 3 complete (all agents merged)

- [ ] All sections above checked
- [ ] `main` builds and runs locally
- [ ] ngrok demo path rehearsed per `DEMO.md`
- [ ] `04-build-test-deploy/code-artifacts/README.md` updated with PR links
- [ ] Ready for Phase 4 production launch criteria
