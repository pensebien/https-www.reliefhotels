# Phase 3 — Execution Planning

**Status:** Complete (2026-06-02)  
**Framework:** [BVDLC Context Folder Structure](https://bvdlc.ai/resources/context-folder-structure.html)

> **Design rule:** All delivery work traces through `project-context/` phases 0→5. Code, agents, and deploy steps must link back to business context, architecture ADRs, and acceptance criteria in this folder.

## Documents

| File | Purpose |
|------|---------|
| [implementation-roadmap.md](implementation-roadmap.md) | Milestones M1–M5, waves, merge order |
| [task-breakdown.md](task-breakdown.md) | Task IDs by phase and agent |
| [dependencies.md](dependencies.md) | Internal sequence + external services |
| [risk-assessment.md](risk-assessment.md) | Risks, mitigations, residual acceptance |
| [resource-allocation.md](resource-allocation.md) | Roles, time, budget |

## AI prompts (standard prompts for agents & humans)

| File | Use when |
|------|----------|
| [ai-prompts/code-generation-prompts.md](ai-prompts/code-generation-prompts.md) | Launching Agents A, D, E, F |
| [ai-prompts/test-generation-prompts.md](ai-prompts/test-generation-prompts.md) | Extending QA handoffs |
| [ai-prompts/review-prompts.md](ai-prompts/review-prompts.md) | PR review before merge |

**Operational prompts:** `docs/prompts/agents/*.md` · Index: `docs/DELIVERY_AGENT_PROMPTS.md`

## Acceptance criteria

| File | Gate |
|------|------|
| [acceptance-criteria/phase-1-prototype.md](acceptance-criteria/phase-1-prototype.md) | Prototype validation + agent launch |
| [acceptance-criteria/phase-3-agent-delivery.md](acceptance-criteria/phase-3-agent-delivery.md) | Per-agent merge DoD |
| [acceptance-criteria/phase-4-production-launch.md](acceptance-criteria/phase-4-production-launch.md) | Render + Supabase + live integrations |

## Traceability

| Upstream | Downstream |
|----------|------------|
| `../00-business-context/success-metrics.md` | Roadmap KPIs |
| `../02-architecture/` (ADRs, NFRs) | Agent D/F scope |
| `docs/DELIVERY_PHASED_BUILD_SPEC.md` | Waves & branches |
| `docs/SCRUM_MASTER_CHECKLIST.md` | Agent HOLD gate |
| `../04-build-test-deploy/` | Evidence after merge |

## Current focus

1. Complete Phase 1 validation (checklist §2–3)  
2. Clear agent HOLD → execute waves per roadmap  
3. Record results in `04-build-test-deploy/` as agents complete  
