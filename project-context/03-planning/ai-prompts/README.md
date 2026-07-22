# AI Prompts (Phase 3)

Per [BVDLC context structure](https://bvdlc.ai/resources/context-folder-structure.html):

| File | Purpose |
|------|---------|
| [code-generation-prompts.md](code-generation-prompts.md) | Historical agent A/D/E/F starters |
| [test-generation-prompts.md](test-generation-prompts.md) | Extend QA checklists |
| [review-prompts.md](review-prompts.md) | PR / architecture / KPI review |

## Current practice

Use feature branches in the main repo. Ops + QA live under:

- `docs/ENV_MATRIX.md`
- `docs/deploy/STAFF.md`
- `docs/testing/reservation-qa-checklist.md`

## Structural rule

Every prompt must cite `project-context/` paths (00 → 02 minimum). Do not generate code that contradicts Accepted ADRs in `02-architecture/architecture-decision-records/`.
