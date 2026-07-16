# Staff HMS — ops flows

**Roadmap:** `project-context/03-planning/hms-expansion-roadmap.md`  
**Portal:** `/en/staff?key=YOUR_KEY&role=front_desk|manager|accountant`

## Surfaces

| Path | Role focus | Purpose |
|------|------------|---------|
| `/staff` | All | Bookings inbox / lists / calendar toggle |
| `/staff/cashier` | Front desk | Settle room deposit (cash / Paystack / Moniepoint) |
| `/staff/fnb` | Front desk | Minibar & F&B folio charges |
| `/staff/calendar` | Front desk / manager | Occupancy calendar |
| `/staff/accounting` | Accountant | Payments ledger + CSV |

## Guest booking (fully built)

1. Property bar → dates → `/rooms` availability  
2. Select room → `/book` (dates required)  
3. `POST /api/reservations` → Paystack deposit → verify → confirmed  

## Front-desk reservation

1. Walk-in create on dashboard **or** guest pending booking  
2. Cashier settle unpaid deposit  
3. Optional F&B charges on folio  
4. Confirm / cancel / staff notes  

## Loyalty

Not built — see `project-context/05-monitoring-value/loyalty-todo.md`.
