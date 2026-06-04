# Dependencies

**Aligned with:** `../02-architecture/integration-points.md` · [BVDLC structure](https://bvdlc.ai/resources/context-folder-structure.html)

## Document dependency graph

```text
00-business-context (KPIs, budget)
        ↓
01-prototyping (GO, learnings)
        ↓
02-architecture (ADRs, NFRs, security)
        ↓
03-planning (this folder — waves, acceptance, prompts)
        ↓
04-build-test-deploy (PR evidence, test results)
        ↓
05-monitoring-value (KPI reports, runbooks)
```

Code and agents must reference the phase folder for their work — not skip to implementation without traceability.

## External services

| Service | Purpose | Required for | Owner setup |
|---------|---------|--------------|-------------|
| GitHub | Source, branches | All agents | Tech Lead |
| Render | Production host | Phase 4 | Tech Lead |
| Supabase | Postgres | Agent D, production | Tech Lead |
| Paystack | Payments | V1, production | Kalu |
| Resend | Email | Reservations inbox | Tech Lead |
| Termii | SMS (+ WA if enabled) | Agent F, production | Tech Lead + Ops |
| WhatsApp BSP | Manager WA alerts | Agent F (ADR-003) | Kalu + Tech Lead |
| ngrok | Client demos | Phase 1–2 | Tech Lead |

## Internal execution sequence

```text
Phase 1 acceptance (phase-1-prototype.md)
    → Clear SCRUM §4 agent HOLD
        → Wave 1: Agent A
            → Wave 2: Agent D (Supabase)
                → Wave 3: E-v1 ∥ E-v2 ∥ F
                    → Merge to main
                        → Phase 4 (phase-4-production-launch.md)
                            → Phase 5 monitoring
```

## Agent dependencies

| Agent | Depends on | Blocks |
|-------|------------|--------|
| A | Phase 1 gate | D, E, F |
| D | A merged | E, F (data shape) |
| E-v1 | D merged | — |
| E-v2 | D merged | — |
| F | D merged; merge after E | Production notify |

## Critical path

1. Prototype scorecard + POC  
2. Agent D (Supabase) — blocks reliable production  
3. Agent F (WhatsApp BSP approval) — may parallelize with E but merge last  
4. Render DNS + Paystack live callback URL  

## Blockers log

| ID | Blocker | Owner | Mitigation |
|----|---------|-------|------------|
| B-01 | WhatsApp Business verification | Kalu | Start early; SMS-only env flag emergency only |
| B-02 | Supabase project not created | Tech Lead | Create before Agent D |
| B-03 | Custom domain DNS | Kalu | ngrok until live |
| B-04 | Agent HOLD | Tech Lead | Complete SCRUM §2–3 |
