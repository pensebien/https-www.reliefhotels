#!/usr/bin/env bash
# Relief Hotels — bootstrap agent branches + git worktrees (legacy delivery wave)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Agent map: letter|slug|workspace folder name
AGENTS=(
  "a|platform-env|agent-a-platform-env"
  "d|api-services|agent-d-api-services"
  "e|prototype-v1-booking|agent-e-prototype-v1-booking"
  "e|prototype-v2-experiences|agent-e-prototype-v2-experiences"
  "f|notifications|agent-f-notifications"
)

BASE_BRANCH="${BASE_BRANCH:-main}"
WORKSPACE_ROOT="$REPO_ROOT/agent-workspaces"

echo "== Relief Hotels agent bootstrap =="
echo "Repo: $REPO_ROOT"
echo "Base branch: $BASE_BRANCH"
echo ""

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Error: not a git repository."
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Warning: working tree has uncommitted changes."
  echo "  Commit or stash on '$BASE_BRANCH' first so worktrees match your baseline."
  echo "  Example:"
  echo "    git add -A && git commit -m \"chore: baseline before agent wave\""
  echo "    $0"
  echo ""
  if [[ "${AGENT_BOOTSTRAP_YES:-}" != "1" ]]; then
    read -r -p "Continue anyway (worktrees will use last commit only)? [y/N] " ans
    [[ "${ans:-N}" =~ ^[Yy]$ ]] || exit 1
  else
    echo "AGENT_BOOTSTRAP_YES=1 — continuing with HEAD commit only."
  fi
fi

git fetch origin 2>/dev/null || true
if git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
  git checkout "$BASE_BRANCH"
else
  echo "Error: branch $BASE_BRANCH not found."
  exit 1
fi

mkdir -p "$WORKSPACE_ROOT" agent-workspaces

# Coordinator worktree (docs on main) — optional
if [[ ! -d "$WORKSPACE_ROOT/base-main" ]]; then
  echo "Adding coordinator worktree: agent-workspaces/base-main → $BASE_BRANCH"
  git worktree add "$WORKSPACE_ROOT/base-main" "$BASE_BRANCH" 2>/dev/null || {
    echo "  (skip base-main: may already exist elsewhere)"
  }
fi

for entry in "${AGENTS[@]}"; do
  IFS='|' read -r letter slug folder <<<"$entry"
  branch="features/agent-${letter}-${slug}"
  path="$WORKSPACE_ROOT/$folder"

  if ! git show-ref --verify --quiet "refs/heads/$branch"; then
    echo "Creating branch: $branch"
    git branch "$branch" "$BASE_BRANCH"
  else
    echo "Branch exists: $branch"
  fi

  if [[ -d "$path" ]]; then
    echo "Worktree exists: $path (skip)"
  else
    echo "Adding worktree: $path → $branch"
    git worktree add "$path" "$branch"
  fi
done

echo ""
echo "Done. Workspaces:"
git worktree list
echo ""
echo "Next:"
echo "  1. Open each folder in Cursor (separate window) or cd agent-workspaces/<agent>"
echo "  2. Work in the worktree; QA via docs/testing/reservation-qa-checklist.md"
echo "  3. PR: ./scripts/agent-pr-create.sh"
echo "  4. Merge order: ./scripts/agent-merge-queue.sh (after QA)"
