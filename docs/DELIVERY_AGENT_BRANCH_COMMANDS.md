# Agent Branch Commands — Relief Hotels

**Worktrees:** [agent-workspaces/README.md](../agent-workspaces/README.md)  
**Render deploy:** [docs/deploy/RENDER.md](deploy/RENDER.md)

Run from repo root: `/Users/macbookpro/projects/hotels-website-kalu/reliefhotels`

---

## 1. One-shot bootstrap (branches + worktrees)

```bash
cd /Users/macbookpro/projects/hotels-website-kalu/reliefhotels
chmod +x scripts/*.sh

# Commit baseline on main first (recommended)
git add -A
git commit -m "chore: baseline before agent delivery wave"

./scripts/agent-bootstrap.sh
```

Creates:

| Branch | Worktree path |
|--------|----------------|
| `features/agent-a-platform-env` | `agent-workspaces/agent-a-platform-env/` |
| `features/agent-d-api-services` | `agent-workspaces/agent-d-api-services/` |
| `features/agent-e-prototype-v1-booking` | `agent-workspaces/agent-e-prototype-v1-booking/` |
| `features/agent-e-prototype-v2-experiences` | `agent-workspaces/agent-e-prototype-v2-experiences/` |
| `features/agent-f-notifications` | `agent-workspaces/agent-f-notifications/` |
| `main` (optional) | `agent-workspaces/base-main/` |

After baseline commit on `main`:

```bash
./scripts/agent-refresh-branches.sh   # reset agent branch tips to main
# In each worktree: git merge main
```

---

## 2. Manual branch create (without worktrees)

```bash
git fetch origin
git checkout main
git pull origin main

for b in \
  features/agent-a-platform-env \
  features/agent-d-api-services \
  features/agent-e-prototype-v1-booking \
  features/agent-e-prototype-v2-experiences \
  features/agent-f-notifications
do
  git branch "$b" main 2>/dev/null || true
  git push -u origin "$b"
done
git checkout main
```

---

## 3. Work in a worktree

```bash
cd agent-workspaces/agent-d-api-services
npm install
npm run dev   # use port 3001 if main uses 3000: PORT=3001 npm run dev
git push -u origin features/agent-d-api-services
```

---

## 4. Merge order (after QA)

```bash
./scripts/agent-merge-queue.sh
git push origin main
```

Or manual:

```bash
git checkout main
git merge --no-ff features/agent-a-platform-env
git merge --no-ff features/agent-d-api-services
git merge --no-ff features/agent-e-prototype-v1-booking
git merge --no-ff features/agent-e-prototype-v2-experiences
git merge --no-ff features/agent-f-notifications
git push origin main
```

---

## 5. Pull requests (GitHub CLI)

```bash
./scripts/agent-pr-create.sh
```

Or individually:

```bash
gh pr create --base main --head features/agent-a-platform-env \
  --title "Agent A: platform & env" \
  --body "See docs/testing/agent-a-platform-env-TESTS.md"

gh pr create --base main --head features/agent-d-api-services \
  --title "Agent D: API services (Supabase)"

gh pr create --base main --head features/agent-e-prototype-v1-booking \
  --title "Agent E: Prototype V1 booking"

gh pr create --base main --head features/agent-e-prototype-v2-experiences \
  --title "Agent E: Prototype V2 experiences"

gh pr create --base main --head features/agent-f-notifications \
  --title "Agent F: Prototype V3 notifications"
```

---

## 6. Remove worktrees when done

```bash
git worktree remove agent-workspaces/agent-a-platform-env
# repeat per agent
```
