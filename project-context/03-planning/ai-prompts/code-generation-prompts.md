# Code Generation Prompts (Phase 3)

Use with `docs/prompts/agents/*.md` for branch-specific detail.  
**Always include** paths under `project-context/` — this is the structural source of truth per [BVDLC](https://bvdlc.ai/resources/context-folder-structure.html).

---

## Global preamble (paste at top of every agent session)

```text
You are delivering Relief Hotels & Suites (Calabar, Nigeria).

STRUCTURE (mandatory):
- Business: project-context/00-business-context/success-metrics.md
- Architecture: project-context/02-architecture/ (ADRs, component-design, integration-points)
- Contract: docs/contracts/api-v1.md
- Acceptance: project-context/03-planning/acceptance-criteria/phase-3-agent-delivery.md
- Env: docs/ENV_MATRIX.md

RULES:
1. Work only on the assigned feature branch.
2. Thin slice — no unrelated refactors.
3. npm run lint && npm run build must pass.
4. Complete the agent TEST doc in docs/testing/.
5. No secrets in client bundles.

Confirmed stack: Next.js 16, Render, Supabase Postgres, Paystack, Resend, Termii SMS+WhatsApp (NOTIFY_CHANNEL=both in prod).
```

---

## Agent A — Platform & environment

```text
[Paste global preamble]

Branch: features/agent-a-platform-env

OBJECTIVE:
Align platform config with project-context/02-architecture/ and docs/ENV_MATRIX.md.

DELIVER:
- .env.example completeness (Supabase DATABASE_URL, WHATSAPP_* placeholders)
- lib/config.ts handles Render URL + demo flags
- README or docs pointer to ENV_MATRIX
- No feature UI changes

ACCEPTANCE: docs/testing/agent-a-platform-env-TESTS.md all checked.

OUT OF SCOPE: Supabase schema (Agent D), notification logic (Agent F).
```

---

## Agent D — API services + Supabase

```text
[Paste global preamble]

Branch: features/agent-d-api-services

OBJECTIVE:
Implement ADR-001: Supabase persistence replacing file stores for production path.
Keep local file fallback OR env flag for demo if architecture allows.

DELIVER:
- Repository layer: lib/repositories/* (reservations, payments, event_inquiries, dining_reservations)
- Migrate demo-store + inquiry-store callers in app/api/*
- Schema migration file or Supabase SQL in docs/
- Stable api-v1 response shapes
- Unique constraint on paystack reference

ACCEPTANCE: docs/testing/agent-d-api-services-TESTS.md + curl tests with DATABASE_URL.

TRACE: project-context/02-architecture/architecture-decision-records/ADR-001-database-choice.md

OUT OF SCOPE: WhatsApp send (Agent F), page UI (Agent E).
```

---

## Agent E — Prototype V1 (booking)

```text
[Paste global preamble]

Branch: features/agent-e-prototype-v1-booking

OBJECTIVE:
Harden V1 booking UX per prototype-v1 and success-metrics (booking reliability, mobile).

DELIVER:
- /[locale]/book, rooms, payment/callback polish
- booking-form + paystack-checkout error states
- Align copy with 5-star brand
- No API contract breaks

ACCEPTANCE: docs/testing/agent-e-prototype-v1-booking-TESTS.md

CONTEXT: project-context/01-prototyping/prototype-experiments/prototype-v1/README.md
```

---

## Agent E — Prototype V2 (experiences)

```text
[Paste global preamble]

Branch: features/agent-e-prototype-v2-experiences

OBJECTIVE:
Harden events, dine-wine, experiences per prototype-v2.

DELIVER:
- event-inquiry-form + dining-reservation-form UX
- /events, /dine-wine, /tours, /experiences consistency
- Corporate + tourist conversion paths visible from home

ACCEPTANCE: docs/testing/agent-e-prototype-v2-experiences-TESTS.md

OUT OF SCOPE: Notification provider changes beyond form submit.
```

---

## Agent F — Prototype V3 (notifications)

```text
[Paste global preamble]

Branch: features/agent-f-notifications

OBJECTIVE:
Implement ADR-003: SMS + WhatsApp at launch (NOTIFY_CHANNEL=both).

DELIVER:
- Extend src/lib/notifications.ts: Termii SMS + WhatsApp (Termii WA or Meta per POC)
- Hook all four api-v1 triggers with NotifyPayload
- Per-channel result logging for KPI ≥95%
- .env.example: NOTIFY_CHANNEL, WHATSAPP_PROVIDER, keys
- Console fallback for local demo

ACCEPTANCE: docs/testing/agent-f-notifications-TESTS.md
TRACE: ADR-003, notification-poc-plan.md, operations-runbooks/manager-notifications.md

MERGE LAST after A, D, E-v1, E-v2.
```

---

## Coordinator merge prompt (human)

```text
Prepare merge of branch <BRANCH> into main.

Check:
1. project-context/03-planning/acceptance-criteria/phase-3-agent-delivery.md §<AGENT>
2. docs/testing/agent-*-TESTS.md signed
3. No conflict with docs/contracts/api-v1.md
4. ADR compliance for D (Supabase) and F (dual notify)

Output: merge checklist + any follow-up tasks for 04-build-test-deploy/.
```
