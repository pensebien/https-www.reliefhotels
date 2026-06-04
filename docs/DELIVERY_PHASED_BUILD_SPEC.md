# Relief Hotels — Phased Build Spec (Agentic Delivery)

**Project:** Relief Hotels & Suites  
**Template:** `docs/prompts/AGENTIC_DELIVERY_TEMPLATE.md`  
**BVDLC structure:** [context-folder-structure](https://bvdlc.ai/resources/context-folder-structure.html) — all design/delivery traces `project-context/` phases 0→5  
**Planning:** `project-context/03-planning/` (roadmap, acceptance, `ai-prompts/`)  
**Business context:** `project-context/00-business-context/` + `docs/contracts/business-context-summary.md`

---

## 1) Prototype → Phase → Agent map

| Prototype | BVDLC context | Delivery agent | Branch | Wave | KPI alignment |
|-----------|---------------|----------------|--------|------|---------------|
| **V1** Core booking journey | `01-prototyping/prototype-experiments/prototype-v1/` | **E** Booking UX | `features/agent-e-prototype-v1-booking` | 3 | Paid bookings, booking reliability |
| **V2** Experiences & events | `01-prototyping/prototype-experiments/prototype-v2/` | **E** Experiences UX | `features/agent-e-prototype-v2-experiences` | 3 | Corporate + tourist conversion |
| **V3** Notification reliability | `01-prototyping/prototype-experiments/prototype-v3/` | **F** Notifications | `features/agent-f-notifications` | 3 | Manager SMS/WhatsApp ≥95% |
| — Platform / CI | Phase 4 prep | **A** Platform | `features/agent-a-platform-env` | 1 | Website readiness |
| — API contracts | Phase 4 | **D** API services | `features/agent-d-api-services` | 2 | Storage + traceability |

**Note:** V1/V2 code largely exists under `src/features/phase-*`; agents **harden, test, and branch-isolate** in **git worktrees** (`agent-workspaces/`). See `scripts/agent-bootstrap.sh`.

**Relief agent map (no B/C/H for this project):**

| Agent | Stream | Branch slug | Workspace |
|-------|--------|-------------|-----------|
| A | platform-env | `platform-env` | `agent-workspaces/agent-a-platform-env` |
| D | api-services | `api-services` | `agent-workspaces/agent-d-api-services` |
| E | prototype-v1-booking | `prototype-v1-booking` | `agent-workspaces/agent-e-prototype-v1-booking` |
| E | prototype-v2-experiences | `prototype-v2-experiences` | `agent-workspaces/agent-e-prototype-v2-experiences` |
| F | notifications | `notifications` | `agent-workspaces/agent-f-notifications` |

---

## 2) Wave launch order

```text
Wave 1 (parallel):     Agent A — platform & env
Wave 2 (after A):      Agent D — API services (contracts + hooks for F)
Wave 3 (parallel):     Agent E-v1, Agent E-v2, Agent F
                       ↑ F depends on D route shapes; can start mock SMS in parallel
```

### Merge order (after QA sign-off)

1. `features/agent-a-platform-env`
2. `features/agent-d-api-services`
3. `features/agent-e-prototype-v1-booking`
4. `features/agent-e-prototype-v2-experiences`
5. `features/agent-f-notifications` **(last — touches all APIs)**

---

## 3) Definition of done (release slice)

Aligned with Phase 0 approval:

- [ ] Homepage + rooms + book + payment callback work on ngrok/production URL
- [ ] Events + dine-wine inquiry forms submit and appear in demo dashboard
- [ ] Reservation + payment + inquiry triggers send manager notification (or logged demo with dashboard fallback)
- [ ] All agent TEST docs signed off
- [ ] `prototype-scorecard.md` average ≥ 3.5 → GO for Phase 2 architecture

---

## 4) Workspace folders (optional worktrees)

| Agent | Workspace path |
|-------|----------------|
| A | `agent-workspaces/agent-a-platform-env` |
| D | `agent-workspaces/agent-d-api-services` |
| E V1 | `agent-workspaces/agent-e-prototype-v1-booking` |
| E V2 | `agent-workspaces/agent-e-prototype-v2-experiences` |
| F | `agent-workspaces/agent-f-notifications` |

Bootstrap (you run):

```bash
cd /Users/macbookpro/projects/hotels-website-kalu/reliefhotels
mkdir -p agent-workspaces docs/testing docs/contracts docs/prompts/agents scripts
```

See `docs/DELIVERY_AGENT_BRANCH_COMMANDS.md`.

---

## 5) Coordinator files

| File | Purpose |
|------|---------|
| `docs/DELIVERY_PHASED_BUILD_SPEC.md` | This file |
| `docs/DELIVERY_AGENT_PROMPTS.md` | Prompt index |
| `docs/DELIVERY_AGENT_BRANCH_COMMANDS.md` | Git commands |
| `docs/contracts/business-context-summary.md` | Phase 0 KPIs for agents |
| `docs/contracts/api-v1.md` | API contract for D + F |
| `docs/testing/agent-*-TESTS.md` | QA per agent |
| `project-context/03-planning/implementation-roadmap.md` | Links BVDLC planning to agents |

---

## 6) Scrum clock (1-hour launch)

| Time | Action |
|------|--------|
| T+0 | Publish agent map; confirm ngrok URL for QA |
| T+5 | Start Agent A |
| T+15 | Start Agent D |
| T+25 | Start E-v1, E-v2, F (three prompts / three branches) |
| T+50 | Collect TEST doc links; run smoke on main or PR previews |
| T+60 | Queue merges A → D → E-v1 → E-v2 → F |

---

## 7) Out of scope (this delivery wave)

- Full PMS integration
- Production database migration (file store OK for prototype)
- Live Paystack keys on client demo (test mode OK)
- Full FR/IG/YO translation completion
