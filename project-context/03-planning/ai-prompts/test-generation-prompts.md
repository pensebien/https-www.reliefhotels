# Test Generation Prompts (Phase 3)

Use to extend `docs/testing/agent-*-TESTS.md` or `04-build-test-deploy/test-results/`.

---

## Standard test expansion

```text
Read:
- docs/testing/<agent>-TESTS.md
- docs/contracts/api-v1.md
- project-context/02-architecture/nfr-specifications.md

Add manual test cases for:
1. Happy path
2. Validation failure (400)
3. ngrok + NEXT_PUBLIC_APP_URL mismatch
4. DEMO_MODE vs live Paystack
5. Mobile viewport (375px width)

Format each case as:
| ID | Steps | Expected | KPI link |

Do not add Jest tests unless asked — prefer manual QA checklist for this project phase.
```

---

## Agent D — Supabase persistence tests

```text
Generate 5 integration test scenarios for Agent D after Supabase migration:

1. POST reservation → row exists in Supabase (describe SQL check)
2. Duplicate Paystack reference rejected
3. Server restart does not lose last reservation (vs file store)
4. Local dev without DATABASE_URL falls back or fails clearly
5. curl scripts for all four POST endpoints

Append to docs/testing/reservation-qa-checklist.md preserving existing sections.
```

---

## Agent F — Notification KPI tests

```text
Generate notification test matrix for ADR-003 (SMS + WhatsApp):

| NOTIFY_CHANNEL | TERMII | WHATSAPP keys | Expected |
|----------------|--------|---------------|----------|

Include:
- console demo mode
- sms only
- both (production target)
- failure: SMS fails, WhatsApp succeeds → KPI still met

Link to project-context/00-business-context/success-metrics.md § Manager Notification Delivery.

Append to docs/testing/reservation-qa-checklist.md.
```

---

## Phase 4 production smoke

```text
From project-context/03-planning/acceptance-criteria/phase-4-production-launch.md,
generate a 15-step smoke test script for Netlify production URL.

Include Paystack live test card caution, demo dashboard key check, and locale /en load.
Output as numbered checklist suitable for 04-build-test-deploy/test-results/.
```

---

## Regression suite (pre-release)

```text
List regression tests that prove Primary KPI path still works:
20 paid bookings/month requires: discover → book → pay → manager alert.

Map each step to a route and API.
Cross-check project-context/01-prototyping/prototype-experiments/test-script.md.
```
