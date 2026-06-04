# Agent D — API Services & Supabase

You are Agent **D** (API Services) for **Relief Hotels & Suites**.

## Read first

- `docs/contracts/api-v1.md`
- `project-context/02-architecture/architecture-decision-records/ADR-001-database-choice.md`
- `project-context/02-architecture/component-design.md`
- `docs/supabase/schema.sql`

## Workspace & branch

- **Workspace:** `agent-workspaces/agent-d-api-services/`
- **Branch:** `features/agent-d-api-services`

## Global rules

1. Work ONLY inside your worktree.
2. Preserve `api-v1` response shapes.
3. `npm run lint` && `npm run build` pass.
4. Complete `docs/testing/agent-d-api-services-TESTS.md`.
5. Never commit service role keys.

## Minimum deliverable

- `src/lib/db/` — Supabase client, booking + inquiry stores
- `src/lib/demo-store.ts` / `inquiry-store.ts` — Supabase when env set, file fallback for local demo
- `docs/supabase/schema.sql` kept in sync
- Paystack `reference` unique constraint behavior
- Repository notes in `project-context/04-build-test-deploy/dev-notes/`

## Out of scope

- Page UX (Agent E)
- WhatsApp templates (Agent F) — keep notify calls, not provider rewrite unless blocking

## Downstream

Agent F hooks APIs; Agent E consumes stable responses.

## Merge

Merge **second** (after A, before E and F).
