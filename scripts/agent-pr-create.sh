#!/usr/bin/env bash
# Create GitHub PRs for all agent branches (requires gh auth)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

create_pr() {
  local head="$1"
  local title="$2"
  local test_doc="$3"

  if ! git show-ref --verify --quiet "refs/heads/$head"; then
    echo "Skip $head (branch not found locally)"
    return
  fi

  if gh pr view "$head" 2>/dev/null; then
    echo "PR already exists: $head"
    return
  fi

  gh pr create --base main --head "$head" --title "$title" --body "$(cat <<EOF
## Summary
Relief Hotels agent branch per \`docs/DELIVERY_PHASED_BUILD_SPEC.md\`.

## Test plan
- [ ] \`$test_doc\` completed
- [ ] \`npm run build\` in worktree \`agent-workspaces/\`

## Merge order
A → D → E-v1 → E-v2 → F (**F last**)

## BVDLC
- \`project-context/02-architecture/\`
- \`project-context/03-planning/acceptance-criteria/phase-3-agent-delivery.md\`
EOF
)"
  echo "Created PR for $head"
}

create_pr "features/agent-a-platform-env" "Agent A: platform & env" "docs/testing/agent-a-platform-env-TESTS.md"
create_pr "features/agent-d-api-services" "Agent D: API services (Supabase)" "docs/testing/agent-d-api-services-TESTS.md"
create_pr "features/agent-e-prototype-v1-booking" "Agent E: Prototype V1 booking" "docs/testing/agent-e-prototype-v1-booking-TESTS.md"
create_pr "features/agent-e-prototype-v2-experiences" "Agent E: Prototype V2 experiences" "docs/testing/agent-e-prototype-v2-experiences-TESTS.md"
create_pr "features/agent-f-notifications" "Agent F: Prototype V3 notifications" "docs/testing/agent-f-notifications-TESTS.md"

echo ""
gh pr list --limit 10 2>/dev/null || echo "Run: gh auth login"
