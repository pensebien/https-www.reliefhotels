# Task Breakdown

**Planning structure:** [BVDLC Phase 3](https://bvdlc.ai/resources/context-folder-structure.html)  
**Agents:** ON HOLD until `docs/SCRUM_MASTER_CHECKLIST.md` §4

---

## Phase 1 — Prototype validation (human)

| ID | Task | Owner | Done? |
|----|------|-------|-------|
| P1-01 | Run 5+ sessions (`../01-prototyping/.../test-script.md`) | Tech Lead | [ ] |
| P1-02 | Update `participant-matrix.md`, `feedback-summary.md` | Tech Lead | [ ] |
| P1-03 | `prototype-scorecard.md` ≥ 3.5 | Kalu + Tech Lead | [ ] |
| P1-04 | SMS + WhatsApp POC (`notification-poc-plan.md`) | Tech Lead + Ops | [ ] |
| P1-05 | `acceptance-criteria/phase-1-prototype.md` signed | Kalu | [ ] |

---

## Phase 2 — Architecture ✅

| ID | Task | Owner | Done? |
|----|------|-------|-------|
| P2-01 | Solution + component + integration docs | Tech Lead | [x] |
| P2-02 | ADR-001 Supabase, ADR-002 API, ADR-003 notify, ADR-004 Render | Tech Lead | [x] |
| P2-03 | Mermaid diagrams | Tech Lead | [x] |
| P2-04 | Security + NFR specs | Tech Lead | [x] |

---

## Phase 3 — Planning ✅

| ID | Task | Owner | Done? |
|----|------|-------|-------|
| P3-01 | Roadmap, tasks, dependencies, risks | Tech Lead | [x] |
| P3-02 | `resource-allocation.md` | Tech Lead | [x] |
| P3-03 | `ai-prompts/*` (code, test, review) | Tech Lead | [x] |
| P3-04 | Acceptance criteria phase 1/3/4 | Tech Lead | [x] |

---

## Phase 3b — Agent execution (after HOLD cleared)

### Agent A — `features/agent-a-platform-env`

| ID | Task | Done? |
|----|------|-------|
| A-01 | `.env.example` + config for Render/Supabase/WhatsApp | [ ] |
| A-02 | Document env in ENV_MATRIX if gaps | [ ] |
| A-03 | TEST doc sign-off | [ ] |

### Agent D — `features/agent-d-api-services`

| ID | Task | Done? |
|----|------|-------|
| D-01 | Supabase schema + migration | [ ] |
| D-02 | Repository layer; wire all POST APIs | [ ] |
| D-03 | Paystack reference uniqueness | [ ] |
| D-04 | TEST doc + curl validation | [ ] |

### Agent E V1 — `features/agent-e-prototype-v1-booking`

| ID | Task | Done? |
|----|------|-------|
| E1-01 | Book / rooms / payment UX hardening | [ ] |
| E1-02 | Mobile + error states | [ ] |
| E1-03 | TEST doc sign-off | [ ] |

### Agent E V2 — `features/agent-e-prototype-v2-experiences`

| ID | Task | Done? |
|----|------|-------|
| E2-01 | Events + dine-wine forms and pages | [ ] |
| E2-02 | Experiences / tours alignment | [ ] |
| E2-03 | TEST doc sign-off | [ ] |

### Agent F — `features/agent-f-notifications` (merge last)

| ID | Task | Done? |
|----|------|-------|
| F-01 | SMS + WhatsApp in `notifications.ts` | [ ] |
| F-02 | Wire four api-v1 triggers | [ ] |
| F-03 | Delivery logging for KPI | [ ] |
| F-04 | TEST doc sign-off | [ ] |

---

## Phase 4 — Build, test, deploy

| ID | Task | Owner | Done? |
|----|------|-------|-------|
| P4-01 | Render deploy + DNS | Tech Lead | [ ] |
| P4-02 | Production env (ENV_MATRIX) | Tech Lead | [ ] |
| P4-03 | Paystack live + smoke test | Kalu + Tech Lead | [ ] |
| P4-04 | `phase-4-production-launch.md` sign-off | Kalu | [ ] |
| P4-05 | Fill `04-build-test-deploy/*` evidence | Tech Lead | [ ] |

---

## Phase 3c — Cashier dual POS (ADR-005)

| ID | Task | Agent | Done? |
|----|------|-------|-------|
| G-01 | Contracts, ADR-005, migration-008, CASHIER.md | G | [x] |
| H-01 | Settle API + Paystack Terminal + Moniepoint adapters | H | [x] |
| I-01 | Staff cashier UI (pick reservation → pay) | I | [x] |
| J-01 | Offline cash outbox + flush | J | [x] |

**Merge order:** G → H → I → J  

See `cashier-module-plan.md`.

---

## Phase 3c2 — HMS expansion (post-cashier)

| ID | Task | Agent | Done? |
|----|------|-------|-------|
| K-01 | Minibar/F&B catalog + folio charges API/UI | K | [ ] |
| L-01 | Staff roles shell (front_desk / manager / accountant) | L | [ ] |
| M-01 | Accounting ledger + summaries | M | [ ] |
| N-01 | Dedicated staff calendar page | N | [ ] |
| LOY-01 | Loyalty backlog TODO only | — | [x] see `loyalty-todo.md` |

**Merge order:** K → L → M → N  

See `hms-expansion-roadmap.md`.

---

## Phase 5 — Monitoring (post-launch)

| ID | Task | Owner |
|----|------|-------|
| P5-01 | Week-1 / month-1 KPI reports | Tech Lead |
| P5-02 | Operations runbook drill | Operations |
| P5-03 | `improvement-backlog.md` grooming | Kalu + Tech Lead |
