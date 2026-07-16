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
| **G** | `features/agent-g-cashier-contracts` | `agent-workspaces/agent-g-cashier-contracts/` | Cashier ADR/docs (wave 2) |
| **H** | `features/agent-h-cashier-api` | `agent-workspaces/agent-h-cashier-api/` | Cashier settle API |
| **I** | `features/agent-i-cashier-ui` | `agent-workspaces/agent-i-cashier-ui/` | Cashier staff UI |
| **J** | `features/agent-j-cashier-offline` | `agent-workspaces/agent-j-cashier-offline/` | Cashier offline outbox |
| Coordinator | `main` | `agent-workspaces/base-main/` (optional) | Docs, merges |

Cashier bootstrap: `./scripts/agent-bootstrap-cashier.sh` · PRs: `./scripts/agent-pr-create-cashier.sh` · Merge **G → H → I → J**.


## Rules

1. Edit files **only** inside the agent’s worktree folder for that session.
2. Never commit to `main` from an agent worktree.
3. Run `npm run lint` and `npm run build` in that worktree before PR.
4. Complete the matching `docs/testing/agent-*-TESTS.md`.

## PR & merge

**PRs require commits on the agent branch that are not on `main`.**  
If every branch matches `main`, GitHub returns: *No commits between main and features/agent-*`.

```bash
# 1. Work only in this folder, commit here
cd agent-workspaces/agent-d-api-services
git add -A && git commit -m "feat(agent-d): ..."
git push -u origin features/agent-d-api-services

# 2. Verify diff, then PR
git log main..HEAD --oneline
./scripts/agent-pr-create.sh

# 3. After all PRs merged
./scripts/agent-merge-queue.sh
```

Do **not** run `agent-sync-worktrees.sh` before PRs unless you intend to fast-forward agents to `main` with no open PRs.

## List / remove worktrees

```bash
git worktree list
git worktree remove agent-workspaces/agent-a-platform-env  # when done
```

Worktree directories are gitignored except this README.
