#!/usr/bin/env bash
# After committing on main, sync all agent worktrees to latest main
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Commit or stash on main first."
  exit 1
fi

MAIN_SHA="$(git rev-parse main)"
echo "Syncing worktrees to main @ $MAIN_SHA"

for dir in "$REPO_ROOT"/agent-workspaces/agent-*/; do
  [[ -d "$dir" ]] || continue
  name="$(basename "$dir")"
  echo ""
  echo "== $name =="
  git -C "$dir" fetch origin 2>/dev/null || true
  git -C "$dir" merge main -m "sync: merge main into agent branch"
done

echo ""
echo "Optional: ./scripts/agent-refresh-branches.sh then push -f only if resetting branch pointers"
