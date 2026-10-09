# Booking flow diagrams (simple site + RAYZA)

Mermaid (`.mmd`) diagrams for the website booking flow. Since 2026-10-09 RAYZA owns
rates, availability and hotel operations; the Sirvoy-parity PMS diagrams live on
branch `archive/sirvoy-pms`. Open them in
VS Code with a Mermaid preview extension, paste into https://mermaid.live, or view
on GitHub (renders ```` ```mermaid ```` blocks; `.mmd` files render in most Mermaid tools).

| File | Who | What |
|------|-----|------|
| `00-overview.mmd` | Everyone | All roles and systems on one page |
| `01-guest-booking-flow.mmd` | Guests | Search → RAYZA quote → reserve → pay → RAYZA → manage / cancel |
| `02-manager-flow.mmd` | Staff | Online bookings view, payment reconciliation, RAYZA links and sync |
| `06-tech-netlify-setup.mmd` | Tech | Migrations 022/024/025, env vars, webhooks, verification |

Colour key: blue = guest, green = staff / success, amber = tech or needs attention,
red = blocked / error, grey = system.

Prices, stay rules and free rooms always come from RAYZA; when it can't be
reached the website stops selling rather than guessing. Walk-ins, F&B and
check-in/out happen in RAYZA. Refunds remain manual (amber).
