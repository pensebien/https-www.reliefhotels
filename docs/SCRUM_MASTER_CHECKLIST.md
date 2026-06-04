# Scrum Master Checklist — Relief Hotels (one page)

**Sprint focus:** Finish Phase 1 context → **delay agent launch** until gates below pass.  
**KPI:** 20 paid bookings/month | **Sponsor:** Kalu | **Tech Lead:** _owner_

---

## 1. Context & docs (today)

| # | Item | ✓ |
|---|------|---|
| 1.1 | `project-context/00-business-context/` complete + Phase 0 GO | ☐ |
| 1.2 | `project-context/01-prototyping/` test script + scorecard ready | ☐ |
| 1.3 | `project-context/02-architecture/` complete + ADRs accepted | ☐ |
| 1.4 | `project-context/03-planning/` complete (roadmap, prompts, acceptance) | ☐ |
| 1.5 | `docs/ENV_MATRIX.md` reviewed with team | ☐ |
| 1.6 | `docs/contracts/` (api-v1, business summary) linked in demos | ☐ |

---

## 2. Prototype validation (before architecture / agents)

| # | Item | ✓ |
|---|------|---|
| 2.1 | ≥5 sessions run (`01-prototyping/prototype-experiments/test-script.md`) | ☐ |
| 2.2 | `participant-matrix.md` + `feedback-summary.md` updated | ☐ |
| 2.3 | `prototype-scorecard.md` average ≥ 3.5 | ☐ |
| 2.4 | Notification POC (`notification-poc-plan.md`) | ☐ |
| 2.5 | `go-no-go-decision.md` signed **GO** | ☐ |

---

## 3. Demo readiness (ngrok)

| # | Item | ✓ |
|---|------|---|
| 3.1 | `npm run dev` + ngrok URL in `NEXT_PUBLIC_APP_URL` | ☐ |
| 3.2 | Client path: home → rooms → book → payment (test) | ☐ |
| 3.3 | `/demo?key=relief-demo-2026` shows activity | ☐ |
| 3.4 | `DEMO.md` walkthrough rehearsed | ☐ |

---

## 4. Agent launch — **ACTIVE**

```bash
./scripts/agent-bootstrap.sh    # branches + worktrees
```

| Agent | Branch | Workspace | Launch? |
|-------|--------|-----------|---------|
| A Platform | `features/agent-a-platform-env` | `agent-workspaces/agent-a-platform-env/` | Wave 1 |
| D API | `features/agent-d-api-services` | `agent-workspaces/agent-d-api-services/` | Wave 2 |
| E V1 Booking | `features/agent-e-prototype-v1-booking` | `agent-workspaces/agent-e-prototype-v1-booking/` | Wave 3 |
| E V2 Experiences | `features/agent-e-prototype-v2-experiences` | `agent-workspaces/agent-e-prototype-v2-experiences/` | Wave 3 |
| F Notifications | `features/agent-f-notifications` | `agent-workspaces/agent-f-notifications/` | Wave 3 (merge last) |

1. `docs/DELIVERY_AGENT_PROMPTS.md` + worktree per agent  
2. Merge order: **A → D → E-v1 → E-v2 → F**  
3. `./scripts/agent-pr-create.sh` after push  
4. Render: `docs/deploy/RENDER.md`

---

## 5. Next phase triggers

| Trigger | Action |
|---------|--------|
| Phase 1 GO | Confirm `acceptance-criteria/phase-1-prototype.md` |
| Phase 1 + demo ready | Release agent HOLD (§4) — use `03-planning/ai-prompts/` |
| Agents merged | Fill `04-build-test-deploy/` |
| Production deploy | Start `05-monitoring-value/month-1-report.md` |

---

**Daily standup (2 min):** Blockers? Demo date? Scorecard progress?  
**Escalate to Kalu:** GO/NO-GO, budget, domain/DNS.
