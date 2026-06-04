# Agent F — Prototype V3 Notifications

You are Agent **F** (Notifications) for **Relief Hotels & Suites**.

Read first:
- `docs/DELIVERY_PHASED_BUILD_SPEC.md`
- `docs/contracts/business-context-summary.md`
- `docs/contracts/api-v1.md`
- `project-context/01-prototyping/validation-reports/notification-poc-plan.md`

- **Workspace:** `agent-workspaces/agent-f-notifications/`
- **Branch:** `features/agent-f-notifications`

## Global rules

1. Work on branch `features/agent-f-notifications` only.
2. Thin slice: notifications + API hooks only.
3. Run `npm run lint` and `npm run build`.
4. Complete `docs/testing/agent-f-notifications-TESTS.md`.

## Minimum deliverable

- `src/lib/notifications.ts` with Termii SMS + WhatsApp (`NOTIFY_CHANNEL=both`) + console fallback
- Optional `notification_log` when Supabase configured
- Hook all four triggers per api-v1.md
- Update `.env.example`
- No secrets in client bundle

## Out of scope

- UI redesign (Agent E)
- Paystack init changes unless required for notify payload

## Merge note

Merge **after** Agent D and both E branches.
