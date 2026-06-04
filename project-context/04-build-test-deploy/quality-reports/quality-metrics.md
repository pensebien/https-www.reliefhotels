# Quality Metrics

**Target:** Phase 2 NFRs (`../02-architecture/nfr-specifications.md`)

| Metric | Target | Latest | Date |
|--------|--------|--------|------|
| `npm run build` | PASS | — | |
| Booking API success rate | ≥98% | — | |
| Manager notify delivery | ≥95% | — | |
| Lighthouse LCP (mobile) | &lt;2.5s | — | |
| Uptime (production) | ≥99.5% | — | |

## How to measure

- **Build:** CI or local before merge
- **API:** Supabase row count vs API 200 responses (manual weekly)
- **Notify:** Termii dashboard + `notification_log` table
- **LCP:** Chrome Lighthouse on `/en` and `/en/rooms`
- **Uptime:** Render status / external ping
