# Implementation Roadmap (Phase 3 → Build)

**Status:** Phase 3 planning complete  
**Structure:** [BVDLC Context Folder](https://bvdlc.ai/resources/context-folder-structure.html) — all work traces `project-context/` phases 0→5  

**Links:** `docs/DELIVERY_PHASED_BUILD_SPEC.md` · `../02-architecture/` · `acceptance-criteria/`

---

## Execution waves (agents **ACTIVE** — worktrees bootstrapped)

| Wave | When | Agents | Outcome |
|------|------|--------|---------|
| **0** | Now | Human | Phase 1 validation + planning docs |
| **1** | After §4 clear | **A** | Platform env, ENV_MATRIX alignment |
| **2** | After A merge | **D** | Supabase repos + stable API v1 |
| **3** | After D merge | **E-v1**, **E-v2**, **F** (parallel) | Booking UX, experiences UX, SMS+WhatsApp |
| **4** | After all merges | Human | Render deploy, Phase 4 acceptance |

**Merge order:** `A → D → E-v1 → E-v2 → F → main`

---

## Milestones

### M1 — Demo-ready ✅
- [x] ngrok client demos
- [x] BVDLC Phase 0 + Phase 1 docs
- [x] Agentic delivery spec + QA handoffs
- [x] Notification module (console mode)

### M2 — Prototype validation (gate for agents)
- [ ] 5+ sessions (`../01-prototyping/prototype-experiments/test-script.md`)
- [ ] `prototype-scorecard.md` ≥ 3.5
- [ ] SMS POC; WhatsApp POC started (ADR-003)
- [ ] `acceptance-criteria/phase-1-prototype.md` signed

### M3 — Architecture ✅
- [x] Phase 2 docs + ADRs (Render, Supabase, SMS+WhatsApp)
- [x] Phase 3 planning (this folder)

### M3b — Agent delivery
- [x] Core implementation on `main` (Supabase layer, dual notify, platform env)
- [ ] Formal agent branches / TEST sign-off (optional)
- [ ] `acceptance-criteria/phase-3-agent-delivery.md` complete
- [ ] Evidence in `../04-build-test-deploy/`

### M4 — Production launch
- [ ] Render + custom domain
- [ ] Supabase live
- [ ] Paystack live + `NOTIFY_CHANNEL=both`
- [ ] `acceptance-criteria/phase-4-production-launch.md` signed

### M5 — Value (30 days post-launch)
- [ ] `../05-monitoring-value/value-realization-reports/month-1-report.md`
- [ ] Track toward 20 paid bookings/month

---

## Calendar (indicative)

| Week | Focus |
|------|-------|
| W0 | Phase 1 sessions + clear agent HOLD |
| W1 | Agents A + D |
| W2 | Agents E-v1, E-v2, F → merge |
| W3 | Render deploy + live POC |
| W4+ | Monitor KPIs, backlog from Phase 5 |

---

## Coordinator commands

- Branches: `docs/DELIVERY_AGENT_BRANCH_COMMANDS.md`  
- Prompts: `ai-prompts/code-generation-prompts.md` + `docs/prompts/agents/`  
- Scrum gate: `docs/SCRUM_MASTER_CHECKLIST.md`  
