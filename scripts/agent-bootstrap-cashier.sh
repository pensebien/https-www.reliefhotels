#!/usr/bin/env bash
# Bootstrap cashier wave agents G–J (ADR-005) — disjoint ownership
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

AGENTS=(
  "g|cashier-contracts|agent-g-cashier-contracts"
  "h|cashier-api|agent-h-cashier-api"
  "i|cashier-ui|agent-i-cashier-ui"
  "j|cashier-offline|agent-j-cashier-offline"
)

BASE_BRANCH="${BASE_BRANCH:-main}"
WORKSPACE_ROOT="$REPO_ROOT/agent-workspaces"

echo "== Cashier agent bootstrap (G→J) =="
git fetch origin 2>/dev/null || true
git checkout "$BASE_BRANCH"

mkdir -p "$WORKSPACE_ROOT"

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

git worktree list
echo "Merge order: G → H → I → J"
echo "PRs: ./scripts/agent-pr-create-cashier.sh"
