# Booking engine v2 — flow diagrams

Mermaid (`.mmd`) diagrams for the booking engine shipped in PR #43. Open them in
VS Code with a Mermaid preview extension, paste into https://mermaid.live, or view
on GitHub (renders ```` ```mermaid ```` blocks; `.mmd` files render in most Mermaid tools).

| File | Who | What |
|------|-----|------|
| `00-overview.mmd` | Everyone | All roles and systems on one page |
| `01-guest-booking-flow.mmd` | Guests | Search → quote → reserve → pay → manage / cancel |
| `02-manager-flow.mmd` | Manager | Rates page, daily checks, refunds, finance |
| `03-cashier-flow.mmd` | Cashier | Walk-ins, desk payments, folio, check-out |
| `04-fnb-flow.mmd` | F&B (restaurant_owner) | Folio charges for in-house guests |
| `05-housekeeping-flow.mmd` | Cleaner head | Housekeeping and maintenance blocks |
| `06-tech-netlify-setup.mmd` | Tech | Migration 016, env vars, webhooks, verification |

Colour key: blue = guest, green = staff / success, amber = tech or needs attention,
red = blocked / error, grey = system.

Walk-in bookings use the same engine as online ones: availability is always
enforced, and staff may override stay rules (noted on the booking). The cashier's
suggested amount is the deposit locked at booking. Refunds remain manual (amber).
