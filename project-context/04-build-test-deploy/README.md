# Phase 4 — Build, Test, Deploy

**Status:** In progress (2026-06-02)  
**Framework:** [BVDLC Context Folder Structure](https://bvdlc.ai/resources/context-folder-structure.html)  
**Upstream:** `../03-planning/acceptance-criteria/phase-3-agent-delivery.md` · `phase-4-production-launch.md`

## Folder map

| Folder / file | Purpose |
|---------------|---------|
| [code-artifacts/](code-artifacts/) | PRs, branches, merge commits |
| [test-results/](test-results/) | Manual QA evidence by agent |
| [quality-reports/](quality-reports/) | Build, lint, debt |
| [deployment-logs/](deployment-logs/) | Netlify deploy, rollback |
| [dev-notes/](dev-notes/) | Implementation decisions, known issues |

## Current build focus

| Work stream | Implementation | Evidence |
|-------------|----------------|----------|
| Storage | Supabase + file fallback (`src/lib/db/`) | `dev-notes/implementation-decisions.md` |
| Notifications | Termii SMS + WhatsApp (`src/lib/notifications.ts`) | `test-results/` Agent F |
| Platform env | `.env.example`, `lib/config.ts` | Agent A TEST doc |

## Exit criteria

- [ ] `acceptance-criteria/phase-3-agent-delivery.md` (all agents)
- [ ] `deployment-logs/deployment-checklist.md` complete
- [ ] `acceptance-criteria/phase-4-production-launch.md` signed
- [ ] Hand off to `../05-monitoring-value/`
