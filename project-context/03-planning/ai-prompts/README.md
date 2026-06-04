# AI Prompts (Phase 3)

Per [BVDLC context structure](https://bvdlc.ai/resources/context-folder-structure.html):

| File | Purpose |
|------|---------|
| [code-generation-prompts.md](code-generation-prompts.md) | Agent A, D, E, F session starters |
| [test-generation-prompts.md](test-generation-prompts.md) | Extend `docs/testing/*-TESTS.md` |
| [review-prompts.md](review-prompts.md) | PR / architecture / KPI review |

## Agent launch

**Status:** ON HOLD — `docs/SCRUM_MASTER_CHECKLIST.md` §4

When cleared:

1. Copy global preamble + agent section from `code-generation-prompts.md`  
2. Paste into Cursor with matching `docs/prompts/agents/<agent>.md`  
3. On PR, use `review-prompts.md` pre-merge checklist  
4. Sign `../acceptance-criteria/phase-3-agent-delivery.md`  

## Structural rule

Every prompt must cite `project-context/` paths (00 → 02 minimum). Do not generate code that contradicts Accepted ADRs in `02-architecture/architecture-decision-records/`.
