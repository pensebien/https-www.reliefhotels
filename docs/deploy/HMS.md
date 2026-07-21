# Staff HMS — ops flows

**Roadmap:** `project-context/03-planning/hms-expansion-roadmap.md`  
**Portal:** `/en/staff?key=YOUR_KEY&role=front_desk|manager|accountant`

## Surfaces

| Path | Role focus | Purpose |
|------|------------|---------|
| `/staff` | All | Bookings inbox / lists / calendar toggle |
| `/staff/cashier` | Front desk | Settle deposits **or** order F&B for booked guests |
| `/staff/fnb` | Front desk | Minibar & F&B folio (search + paginated guest list) |
| `/staff/calendar` | Front desk / manager | Occupancy calendar |
| `/staff/accounting` | Accountant | Payments ledger + CSV |

## Guest booking (fully built)

1. Property bar → dates → `/rooms` availability  
2. Select room → `/book` (dates required)  
3. `POST /api/reservations` → Paystack deposit → verify → confirmed  

## Front-desk reservation

1. Walk-in create on dashboard **or** guest pending booking  
2. Cashier → **Settle deposit** for unpaid bookings  
3. Cashier → **Order F&B** (or `/staff/fnb`) — search booked guest → add catalog lines to folio  
4. Confirm / cancel / staff notes  

On both cashier F&B mode and `/staff/fnb`, search by guest name, email, phone, or reservation ID. Lists paginate (12 per page).

## Loyalty

Not built — see `project-context/05-monitoring-value/loyalty-todo.md`.
