#!/usr/bin/env bash
# Point all agent branches at current main (after baseline commit)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

git checkout main

BRANCHES=(
  features/agent-a-platform-env
  features/agent-d-api-services
  features/agent-e-prototype-v1-booking
  features/agent-e-prototype-v2-experiences
  features/agent-f-notifications
)

for b in "${BRANCHES[@]}"; do
  git branch -f "$b" main
  echo "Reset $b → $(git rev-parse --short main)"
done

echo "In each worktree, run: git pull && git merge main  # or git reset --hard origin/$b after push -f (careful)"
