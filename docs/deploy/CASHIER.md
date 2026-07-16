# Cashier module — dual POS (Paystack + Moniepoint)

**ADR:** `project-context/02-architecture/architecture-decision-records/ADR-005-cashier-dual-pos.md`  
**Plan:** `project-context/03-planning/cashier-module-plan.md`

## Purpose

Staff settle an **existing reservation** at the front desk:

| Method | Provider |
|--------|----------|
| Cash | Local confirm |
| Paystack Terminal | Paystack Payment Request + Terminal Event API |
| Moniepoint terminal | Existing Moniepoint push |
| Moniepoint transfer | Existing Moniepoint transfer + poll/webhook |

## Env

| Variable | Notes |
|----------|--------|
| `CASHIER_ENABLED` | `true` to expose cashier routes/UI (default on when unset in demo) |
| `PAYSTACK_SECRET_KEY` | Same as online Paystack |
| `PAYSTACK_TERMINAL_ID` | Paystack Terminal id for push events |
| `MONIEPOINT_*` | See `MONIEPOINT.md` |
| `DEMO_DASHBOARD_KEY` | Staff auth key |

## Staff URL

`https://reservation.reliefhotelsandsuites.com/en/staff/cashier?key=…`  
(or `/en/staff/cashier` on main host)

## Offline

Cash settlements may queue in IndexedDB (`src/lib/cashier-offline`) and flush with `clientMutationId` idempotency.

## Agents

Merge order: **G → H → I → J** — see cashier-module-plan.md.
