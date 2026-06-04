#!/usr/bin/env bash
# Merge agent branches in order (run from repo root on main, after QA sign-off)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BRANCHES=(
  features/agent-a-platform-env
  features/agent-d-api-services
  features/agent-e-prototype-v1-booking
  features/agent-e-prototype-v2-experiences
  features/agent-f-notifications
)

echo "Merge queue: ${BRANCHES[*]}"
git checkout main
git pull origin main 2>/dev/null || true

for b in "${BRANCHES[@]}"; do
  echo ""
  echo "== Merging $b into main =="
  if ! git show-ref --verify --quiet "refs/heads/$b"; then
    echo "Branch $b missing — skip"
    continue
  fi
  git merge --no-ff "$b" -m "merge: $b into main (agent delivery wave)"
done

echo ""
echo "Done. Push: git push origin main"
echo "Update project-context/04-build-test-deploy/code-artifacts/README.md"
