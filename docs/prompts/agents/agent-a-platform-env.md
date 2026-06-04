# Agent A — Platform & Environment

You are Agent **A** (Platform & Env) for **Relief Hotels & Suites**.

## Read first

- `docs/DELIVERY_PHASED_BUILD_SPEC.md`
- `docs/prompts/AGENTIC_DELIVERY_TEMPLATE.md` (global rules)
- `project-context/02-architecture/` · `docs/ENV_MATRIX.md`
- `project-context/03-planning/acceptance-criteria/phase-3-agent-delivery.md` § Agent A

## Workspace & branch

- **Workspace:** `agent-workspaces/agent-a-platform-env/` (git worktree only)
- **Branch:** `features/agent-a-platform-env` — never commit to `main`

## Global rules

1. Work ONLY inside your worktree folder.
2. Thin slice: platform/env/CI only.
3. `npm run lint` && `npm run build` must pass.
4. Complete `docs/testing/agent-a-platform-env-TESTS.md`.
5. No secrets in client `NEXT_PUBLIC_*` except Paystack public key.

## Minimum deliverable

- `.env.example` aligned with `docs/ENV_MATRIX.md` (Supabase, Render, Termii, WhatsApp)
- `src/lib/config.ts` — Render `RENDER_EXTERNAL_URL`, storage/notify flags
- `.github/workflows/ci.yml` — lint + build on pull_request
- `docs/deploy/RENDER.md` reviewed/updated if gaps
- Optional: `render.yaml` blueprint stub

## Out of scope

- Supabase schema (Agent D)
- UI pages (Agent E)
- Notification provider logic (Agent F)

## Downstream

Agents D, E, F depend on stable env contract documented here.

## Merge

Merge **first** in queue (before D).
