#!/usr/bin/env bash
# Create GitHub PRs for cashier agents G–J
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

create_pr() {
  local head="$1"
  local title="$2"
  local test_doc="$3"

  if ! git show-ref --verify --quiet "refs/heads/$head"; then
    echo "Skip $head (branch not found)"
    return
  fi

  local ahead
  ahead="$(git rev-list --count "main..$head" 2>/dev/null || echo 0)"
  if [[ "$ahead" == "0" ]]; then
    echo "Skip $head — no commits ahead of main"
    return
  fi

  if gh pr view "$head" 2>/dev/null; then
    echo "PR already exists: $head"
    return
  fi

  gh pr create --base main --head "$head" --title "$title" --body "$(cat <<EOF
## Summary
Cashier dual-POS wave (ADR-005). See \`project-context/03-planning/cashier-module-plan.md\`.

## Test plan
- [ ] \`$test_doc\`
- [ ] \`npm run build\` in worktree

## Merge order
**G → H → I → J** (do not merge out of order)

## Providers
Paystack Terminal + Moniepoint + cash
EOF
)"
  echo "Created PR for $head"
}

create_pr "features/agent-g-cashier-contracts" "Agent G: cashier contracts (ADR-005)" "docs/testing/reservation-qa-checklist.md"
create_pr "features/agent-h-cashier-api" "Agent H: cashier settle API (Paystack + Moniepoint)" "docs/testing/reservation-qa-checklist.md"
create_pr "features/agent-i-cashier-ui" "Agent I: cashier staff UI" "docs/testing/reservation-qa-checklist.md"
create_pr "features/agent-j-cashier-offline" "Agent J: cashier offline outbox" "docs/testing/reservation-qa-checklist.md"

gh pr list --limit 15 2>/dev/null || true
