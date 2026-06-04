# Relief Hotels - BVDLC Context

**Last Updated:** 2026-06-02  
**Project Status:** Phase 3 — Execution planning (complete); Phase 1 validation in progress  
**Framework:** [BVDLC Context Folder Structure](https://bvdlc.ai/resources/context-folder-structure.html) — **always use this layout for design and delivery**

## Quick Links

| Phase | Link | Status |
|-------|------|--------|
| 0 | [Business Context](00-business-context/executive-intent.md) | ✅ Complete |
| 1 | [Prototyping](01-prototyping/go-no-go-decision.md) | 🔄 Sessions + scorecard pending |
| 2 | [Architecture](02-architecture/README.md) | ✅ Accepted (Render, Supabase, SMS+WA) |
| 3 | [Planning](03-planning/README.md) | ✅ Complete (roadmap, prompts, acceptance) |
| 4 | [Build / Test / Deploy](04-build-test-deploy/README.md) | 🔄 In progress (Supabase + notify on main) |
| 5 | [Monitoring & Value](05-monitoring-value/README.md) | ⏳ After production |

**Ops docs:** [ENV_MATRIX.md](../docs/ENV_MATRIX.md) · [SCRUM_MASTER_CHECKLIST.md](../docs/SCRUM_MASTER_CHECKLIST.md)

## Project Overview

**Business Problem:** Relief Hotels needs a premium, conversion-focused web presence with secure online booking and fast operational response.  
**Target Outcome:** Reach and sustain **20 paid bookings per month** through web channels.  
**Timeline:** 2026-06-02 → 2026-09-30 (initial 90-day window)

## Audience Priority

1. Local luxury travelers  
2. International tourists  
3. Corporate events  

## Key Stakeholders

- **Executive Sponsor:** Kalu  
- **Tech Lead:** Project owner  
- **Operations Lead:** Hotel Manager / Reservations Manager  

## Current Status

| Area | State |
|------|--------|
| Phase 0 | Approved (`phase-0-approval.md`) |
| Phase 1 | GO recorded; **5+ sessions + scorecard** still required per acceptance criteria |
| Phase 2 | Architecture accepted (Render, Supabase, SMS+WhatsApp) |
| Phase 3 | Planning complete — agents ready when Phase 1 gate clears |
| Agents A–F | **ON HOLD** — `docs/SCRUM_MASTER_CHECKLIST.md` §4 |
| App on `main` | Demo-ready (ngrok, Paystack test, console notifications) |

**Blockers:** Termii live keys for ≥95% SMS KPI; architecture ADRs before production data store.

**Next milestones:**

1. Complete prototype sessions → `acceptance-criteria/phase-1-prototype.md`  
2. Open Phase 2 architecture (`02-architecture/`)  
3. Clear agent launch gate → `docs/DELIVERY_AGENT_BRANCH_COMMANDS.md`

## BVDLC Folder Map

- `00-business-context/` — Strategic foundation and approval  
- `01-prototyping/` — Experiments, user feedback, validation  
- `02-architecture/` — **Gated** — README + ADR template only  
- `03-planning/` — Roadmap, tasks, risks, acceptance, AI prompt index  
- `04-build-test-deploy/` — PR/test/deploy evidence (stubs)  
- `05-monitoring-value/` — KPI reports, runbooks, backlog (stubs)  

## Agentic delivery (delayed)

- Spec: `docs/DELIVERY_PHASED_BUILD_SPEC.md`  
- Prompts: `docs/DELIVERY_AGENT_PROMPTS.md` (**do not launch yet**)  
- Merge order when cleared: A → D → E-v1 → E-v2 → F  
