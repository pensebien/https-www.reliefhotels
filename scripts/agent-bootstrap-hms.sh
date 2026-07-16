#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
AGENTS=(
  "k|hms-fnb|agent-k-hms-fnb"
  "l|hms-roles|agent-l-hms-roles"
  "m|hms-accounting|agent-m-hms-accounting"
  "n|hms-calendar|agent-n-hms-calendar"
)
BASE_BRANCH="${BASE_BRANCH:-main}"
WORKSPACE_ROOT="$REPO_ROOT/agent-workspaces"
git fetch origin 2>/dev/null || true
git checkout "$BASE_BRANCH"
mkdir -p "$WORKSPACE_ROOT"
for entry in "${AGENTS[@]}"; do
  IFS='|' read -r letter slug folder <<<"$entry"
  branch="features/agent-${letter}-${slug}"
  path="$WORKSPACE_ROOT/$folder"
  if ! git show-ref --verify --quiet "refs/heads/$branch"; then
    git branch "$branch" "$BASE_BRANCH"
  fi
  if [[ ! -d "$path" ]]; then
    git worktree add "$path" "$branch"
  fi
done
git worktree list
echo "Merge: K → L → M → N"
