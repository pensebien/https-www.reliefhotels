# Delivery Agent Prompts — Index

**Template:** [AGENTIC_DELIVERY_TEMPLATE.md](prompts/AGENTIC_DELIVERY_TEMPLATE.md)  
**Workspaces:** [agent-workspaces/README.md](../agent-workspaces/README.md)  
**Bootstrap:** `scripts/agent-bootstrap.sh`

Launch one Cursor Agent session per row, from the **worktree folder** path.

| Agent | Stream | Branch | Workspace | Prompt | QA doc |
|-------|--------|--------|-----------|--------|--------|
| **A** | Platform & env | `features/agent-a-platform-env` | `agent-workspaces/agent-a-platform-env/` | [agent-a-platform-env.md](prompts/agents/agent-a-platform-env.md) | [agent-a-platform-env-TESTS.md](testing/agent-a-platform-env-TESTS.md) |
| **D** | API + Supabase | `features/agent-d-api-services` | `agent-workspaces/agent-d-api-services/` | [agent-d-api-services.md](prompts/agents/agent-d-api-services.md) | [agent-d-api-services-TESTS.md](testing/agent-d-api-services-TESTS.md) |
| **E** | V1 Booking | `features/agent-e-prototype-v1-booking` | `agent-workspaces/agent-e-prototype-v1-booking/` | [agent-e-prototype-v1-booking.md](prompts/agents/agent-e-prototype-v1-booking.md) | [agent-e-prototype-v1-booking-TESTS.md](testing/agent-e-prototype-v1-booking-TESTS.md) |
| **E** | V2 Experiences | `features/agent-e-prototype-v2-experiences` | `agent-workspaces/agent-e-prototype-v2-experiences/` | [agent-e-prototype-v2-experiences.md](prompts/agents/agent-e-prototype-v2-experiences.md) | [agent-e-prototype-v2-experiences-TESTS.md](testing/agent-e-prototype-v2-experiences-TESTS.md) |
| **F** | V3 Notifications | `features/agent-f-notifications` | `agent-workspaces/agent-f-notifications/` | [agent-f-notifications.md](prompts/agents/agent-f-notifications.md) | [agent-f-notifications-TESTS.md](testing/agent-f-notifications-TESTS.md) |

## Wave order

1. **A** (Wave 1)  
2. **D** (Wave 2, after A)  
3. **E-v1**, **E-v2**, **F** (Wave 3 parallel; **F merges last**)

## Copy-paste header

From `project-context/03-planning/ai-prompts/code-generation-prompts.md` → global preamble + agent section.

## PR & merge

```bash
./scripts/agent-pr-create.sh
# after QA:
./scripts/agent-merge-queue.sh
```

**Spec:** [DELIVERY_PHASED_BUILD_SPEC.md](DELIVERY_PHASED_BUILD_SPEC.md)
