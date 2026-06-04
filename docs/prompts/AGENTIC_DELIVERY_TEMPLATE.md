# Agentic delivery template (reproducible A–F)

Use this to run **parallel coding agents** on any project with the same delivery discipline used on CravinsOS: isolated workspaces, phased waves, automated checks, manual QA handoff, merge gates.

This is **process**, not a cloud migration plan. Swap stack names (Vercel, Supabase, etc.) for your project.

---

## 1) What you are building

| Concept | Meaning |
|--------|---------|
| **Delivery spec** | Phases, waves, merge order, definition of done |
| **Agent stream** | One letter (A–F) = one concern, one branch, one workspace |
| **Wave** | Batch of agents started together when dependencies allow |
| **Handoff doc** | `docs/testing/agent-<letter>-<slug>-TESTS.md` per agent |
| **Scrum master** | Human (or lead agent) that launches waves, tracks checklist, merges |

**Optional extensions (CravinsOS used these too):**

| Letter | Stream | When to add |
|--------|--------|-------------|
| **G** | Governance / audit / approvals | Financial or regulated data |
| **H** | Ops / CI / runbooks / release | Before first production ship |

---

## 2) Agent map (customize per project)

Fill this table **before** launching agents.

| Agent | Stream | Branch slug | Workspace folder | Depends on |
|-------|--------|-------------|------------------|------------|
| **A** | Platform & env (CI, env matrix, branch protection) | `platform-env` | `agent-workspaces/agent-a-platform-env` | — |
| **B** | Data model (migrations, schema contract) | `data-model` | `agent-workspaces/agent-b-data-model` | — |
| **C** | Ingestion (uploads, parsers, idempotency) | `ingestion` | `agent-workspaces/agent-c-ingestion` | B (schema direction) |
| **D** | Domain / API services (lib, authz, contracts) | `api-services` | `agent-workspaces/agent-d-api-services` | B |
| **E** | Frontend UX (forms, flows, wiring UI to lib) | `frontend-ux` | `agent-workspaces/agent-e-frontend-ux` | D (API contract) |
| **F** | Integrations (payments, webhooks, third-party) | `<integration>` | `agent-workspaces/agent-f-<integration>` | D; UI test via E |

**Branch naming:** `features/agent-<letter>-<slug>`  
**Test doc:** `docs/testing/agent-<letter>-<slug>-TESTS.md`

---

## 3) Wave launch order (default)

```text
Wave 1 (start together):  A, B          [+ H if ops agent exists]
Wave 2 (after B contract): C, D          [+ G if governance agent exists]
Wave 3 (after D contract): E, F
```

**Merge order (after QA):**

1. A (+ H)
2. B — resolve migration numbering before C/G merge
3. C + D (+ G)
4. E + F

---

## 4) Non‑negotiable rules (every agent)

Copy into every agent prompt:

```markdown
## Global rules

1. **Scope:** Work ONLY inside `{{WORKSPACE_PATH}}`. Do not edit files outside this folder.
2. **Branch:** Use ONLY `features/agent-{{LETTER}}-{{SLUG}}`. Never commit to `main`.
3. **Thin slice:** Deliver the **minimum scope** listed below in one session; no drive-by refactors.
4. **Automated checks:** Run and report:
   - `{{LINT_CMD}}`
   - `{{BUILD_CMD}}`
   - Any agent-specific checks listed below
5. **Handoff doc:** Create or complete `docs/testing/agent-{{LETTER}}-{{SLUG}}-TESTS.md` with:
   - Commands run + PASS/FAIL
   - Manual QA steps a non-developer can follow
   - Expected outcomes per step
   - Known limitations / blockers for downstream agents
6. **Secrets:** Never commit `.env`, service role keys, or provider API secrets. Never put secrets in client `VITE_*` / `NEXT_PUBLIC_*` vars.
7. **Output format:** Return exactly:
   - Branch name
   - Files changed
   - Automated check results
   - Manual QA summary (from TEST doc)
   - Blockers for other agents
```

---

## 5) Workspace bootstrap (reproducible)

### One-time repo setup

```bash
# From repo root
mkdir -p agent-workspaces docs/testing docs/contracts docs/runbooks scripts

# Optional: base worktree for coordinator docs on main
git worktree add agent-workspaces/base-main main
```

### Per-agent bootstrap script pattern

`scripts/agent-branch-start.sh <letter>` should:

1. Map letter → branch + TEST doc path  
2. `git fetch` + checkout or create branch  
3. Scaffold empty TEST doc if missing  

### Isolation options

| Method | Pros | Cons |
|--------|------|------|
| **Git worktree per agent** | Shared history, low disk | Same branch cannot be checked out twice |
| **Full folder copy** | Fully isolated | Heavy, drift from git |

**Rule:** One agent = one workspace folder = one branch.

---

## 6) Coordinator docs (create once per project)

| File | Purpose |
|------|---------|
| `docs/DELIVERY_PHASED_BUILD_SPEC.md` | Phases, waves, merge order, DoD |
| `docs/DELIVERY_AGENT_PROMPTS.md` | Short index of agents + paths |
| `docs/DELIVERY_AGENT_BRANCH_COMMANDS.md` | git/gh/PR commands |
| `docs/SPRINT_CEREMONIES.md` | Planning, standup, 1-hour sprint clock |
| `docs/SCRUM_MASTER_CHECKLIST.md` | Status board + blocker log |

---

## 7) Global prompt header (paste above any agent prompt)

```markdown
You are Agent {{LETTER}} ({{STREAM_NAME}}) for project {{PROJECT_NAME}}.

Read first:
- `docs/DELIVERY_PHASED_BUILD_SPEC.md`
- `docs/contracts/` (if exists)
- Relevant existing code under `{{WORKSPACE_PATH}}`

Workspace: `{{WORKSPACE_PATH}}`
Branch: `features/agent-{{LETTER}}-{{SLUG}}`

{{GLOBAL_RULES_BLOCK}}

Minimum deliverable this session:
{{MINIMUM_DELIVERABLE}}

Out of scope:
{{OUT_OF_SCOPE}}

Downstream consumers:
{{DOWNSTREAM_AGENTS}}
```

---

## 8) Agent prompt templates (A–F)

Replace `{{...}}` placeholders. Launch via Cursor Agent, Claude Code, or any task runner.

---

### Agent A — Platform & environments

```markdown
{{GLOBAL_PROMPT_HEADER}}

Implement delivery foundation (Phase 0):

Deliver:
- `docs/ENV_MATRIX.md` — map env vars: local, preview/staging, production (client vs server vs CI)
- CI workflow (e.g. `.github/workflows/ci.yml`) — lint + build on pull_request
- Update `.env.example` if gaps exist
- Complete `docs/testing/agent-a-platform-env-TESTS.md`

Do NOT: add unrelated product features or cloud IaC unless explicitly requested.

Automated: {{LINT_CMD}}, {{BUILD_CMD}}
Manual QA: new contributor can clone, install, run app, and see CI config documented.
```

---

### Agent B — Data model

```markdown
{{GLOBAL_PROMPT_HEADER}}

Implement schema foundation:

Deliver:
- Next numbered migration(s) for core operational tables
- `docs/contracts/schema-v1.md` — tables, keys, RLS notes, rollup intent
- Verification SQL or script notes in TEST doc
- Complete `docs/testing/agent-b-data-model-TESTS.md`

Do NOT: build frontend pages in this branch.

Automated: {{BUILD_CMD}}; migration apply steps documented for manual QA.
Manual QA: apply migration on dev/staging DB; verify tables/policies exist.
Blockers for C/D/G: publish schema contract paths and migration filenames.
```

---

### Agent C — Ingestion

```markdown
{{GLOBAL_PROMPT_HEADER}}

Harden data ingestion path:

Deliver:
- Versioned ingest contract doc (sheet/API/file format)
- Idempotency (e.g. content hash + unique constraint)
- Clear user-visible errors on failure
- Complete `docs/testing/agent-c-ingestion-TESTS.md`

Depends on: Agent B migration direction (do not invent conflicting table names).

Automated: {{LINT_CMD}}, {{BUILD_CMD}}
Manual QA: valid ingest succeeds once; duplicate rejected; invalid shows readable error.
```

---

### Agent D — Domain / API services

```markdown
{{GLOBAL_PROMPT_HEADER}}

Implement domain layer:

Deliver:
- `docs/contracts/api-v1.md` — submit, list, approve, idempotency keys, tenant/store scoping
- Typed modules in `src/lib/` (or `packages/api/`) — mock-safe when backend unset
- Complete `docs/testing/agent-d-api-services-TESTS.md`

Do NOT: full page redesign (Agent E owns UI).

Automated: {{LINT_CMD}}, {{BUILD_CMD}}
Manual QA: call stubs in mock mode; document authz expectations.
Blockers for E/F: list exported functions/types E and F must import.
```

---

### Agent E — Frontend UX

```markdown
{{GLOBAL_PROMPT_HEADER}}

Implement UI flows:

Deliver:
- User-facing screens for forms/approvals/checkout wiring per product spec
- Import domain functions from Agent D (no duplicated business logic in pages)
- No regressions on existing routes
- Complete `docs/testing/agent-e-frontend-ux-TESTS.md` with **non-developer** QA steps

Depends on: Agent D contract (`api-v1.md`, lib paths). Use mocks if backend not merged.

Automated: {{LINT_CMD}}, {{BUILD_CMD}}
Manual QA: role-based flows (owner vs manager), loading/error/success states visible.
```

---

### Agent F — Integrations

```markdown
{{GLOBAL_PROMPT_HEADER}}

Implement integration (simulation first, live later):

Deliver:
- Client-safe types/helpers (e.g. `src/lib/payments.ts`)
- Server/webhook stub with signature verify placeholder + idempotency notes
- No provider secrets in client bundle
- Complete `docs/testing/agent-f-{{INTEGRATION}}-TESTS.md`

Simulation-first rule: ship mock/simulate path before live API keys.

Automated: {{LINT_CMD}}, {{BUILD_CMD}}; grep for leaked secrets in client env prefixes.
Manual QA:
- Console or temp UI calls to simulation helpers (until Agent E wires checkout)
- Optional: curl webhook stub locally

Downstream: Agent E wires UI; Agent D attaches payloads to domain submit; Agent G owns audit on approve.
```

---

## 9) Optional agents (G, H)

### Agent G — Governance

```markdown
Deliver: append-only audit log, approval gates, period lock stubs, verify script, TEST doc.
Rule: no silent destructive edits on posted/locked data.
```

### Agent H — Ops / release

```markdown
Deliver: RELEASE / ROLLBACK / INCIDENT runbooks, CI gate checklist, TEST doc with dry-run steps.
Rule: no product features unrelated to shipping safely.
```

---

## 10) Scrum master launch script (1-hour sprint)

```text
T+0:00  Publish filled agent map + merge order
T+0:05  Start Wave 1 agents (A, B, [H])
T+0:20  Verify branches + TEST doc scaffolds exist
T+0:25  Start Wave 2 (C, D, [G]) after B posts schema-v1
T+0:40  Start Wave 3 (E, F) after D posts api-v1
T+0:55  Collect handoffs; open PRs; assign QA
T+1:00  Merge queue: A+H → B → C+D+G → E+F
```

---

## 11) QA handoff template (per agent)

File: `docs/testing/agent-{{LETTER}}-{{SLUG}}-TESTS.md`

```markdown
# Test handoff — Agent {{LETTER}} ({{STREAM_NAME}})

## Scope delivered
- 

## Automated checks
- [ ] {{LINT_CMD}} — PASS / FAIL
- [ ] {{BUILD_CMD}} — PASS / FAIL

### Commands run
```bash
# paste exact commands
```

## Manual QA
### Preconditions
- Branch checked out
- App running at {{DEV_URL}} (if UI)

### Steps
1. 
2. 

### Expected outcomes
- 

## Sign-off
- [ ] Agent: automated checks passed
- [ ] QA: manual steps passed
- [ ] Ready to merge

## Blockers / follow-ups
- 
```

---

## 12) CravinsOS example (filled snapshot)

| Agent | Workspace | Branch | Minimum deliverable |
|-------|-----------|--------|---------------------|
| A | `agent-workspaces/agent-a-platform-iac` | `features/agent-a-platform-iac` | ENV_MATRIX + GitHub CI |
| B | `agent-workspaces/agent-b-data-model` | `features/agent-b-data-model` | `0008`/`0009` migrations + schema-v1 |
| C | `agent-workspaces/agent-c-ingestion` | `features/agent-c-ingestion` | upload content_hash idempotency |
| D | `agent-workspaces/agent-d-api-services` | `features/agent-d-api-services` | api-v1 + forms/approvals lib |
| E | `agent-workspaces/agent-e-frontend-ux` | `features/agent-e-frontend-ux` | `/approvals` owner shell |
| F | `agent-workspaces/agent-f-moniepoint` | `features/agent-f-moniepoint` | `payments.ts` + webhook stub |

**Lesson learned:** Renumber migrations when B/C/G all ship `0008_*` files — assign one owner (B) to sequence before merge.

**F UI testing:** Agent E wires checkout; until then use browser console `import('/src/lib/payments.ts')` per Agent F TEST doc.

---

## 13) Checklist: ready to reproduce on a new project

- [ ] Fill agent map table (Section 2)
- [ ] Create coordinator docs (Section 6)
- [ ] Add `scripts/agent-branch-start.sh`
- [ ] Create worktrees under `agent-workspaces/`
- [ ] Set `{{LINT_CMD}}` / `{{BUILD_CMD}}` for your stack
- [ ] Launch Wave 1 → 2 → 3 with scrum clock (Section 10)
- [ ] Enforce merge order + QA sign-off before production

---

## Related

- Project coding rules: `docs/prompts/ai-coding-assistant.md`
- CravinsOS delivery copies: `agent-workspaces/base-main/docs/DELIVERY_*.md`
