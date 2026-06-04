# Agent Workspaces (git worktrees)

Per [AGENTIC_DELIVERY_TEMPLATE.md](../docs/prompts/AGENTIC_DELIVERY_TEMPLATE.md): **one agent = one folder = one branch**.

## Bootstrap

```bash
cd /Users/macbookpro/projects/hotels-website-kalu/reliefhotels
chmod +x scripts/*.sh
./scripts/agent-bootstrap.sh
```

Commit baseline on `main` first if you have uncommitted work.

## Worktree map (Relief Hotels agents)

| Agent | Branch | Workspace folder | Open in Cursor |
|-------|--------|------------------|----------------|
| **A** | `features/agent-a-platform-env` | `agent-workspaces/agent-a-platform-env/` | Platform, CI, ENV_MATRIX |
| **D** | `features/agent-d-api-services` | `agent-workspaces/agent-d-api-services/` | Supabase, API, stores |
| **E V1** | `features/agent-e-prototype-v1-booking` | `agent-workspaces/agent-e-prototype-v1-booking/` | Book, rooms, payment |
| **E V2** | `features/agent-e-prototype-v2-experiences` | `agent-workspaces/agent-e-prototype-v2-experiences/` | Events, dine-wine |
| **F** | `features/agent-f-notifications` | `agent-workspaces/agent-f-notifications/` | SMS + WhatsApp (merge **last**) |
| Coordinator | `main` | `agent-workspaces/base-main/` (optional) | Docs, merges |

## Rules

1. Edit files **only** inside the agent’s worktree folder for that session.
2. Never commit to `main` from an agent worktree.
3. Run `npm run lint` and `npm run build` in that worktree before PR.
4. Complete the matching `docs/testing/agent-*-TESTS.md`.

## PR & merge

```bash
./scripts/agent-pr-create.sh      # after push -u origin <branch>
./scripts/agent-merge-queue.sh    # after QA, on main
```

## List / remove worktrees

```bash
git worktree list
git worktree remove agent-workspaces/agent-a-platform-env  # when done
```

Worktree directories are gitignored except this README.
