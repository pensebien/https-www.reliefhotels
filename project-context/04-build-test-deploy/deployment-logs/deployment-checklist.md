# Deployment Checklist — Netlify + Supabase

**Target:** Production persistence (ADR-001) + demo dashboard ops  
**Env reference:** `docs/ENV_MATRIX.md`  
**Guides:** `docs/deploy/NETLIFY.md` · `docs/supabase/schema.sql`

## Pre-deploy

- [ ] `npm run build` PASS
- [ ] `npm run test:qa` PASS (14 automated reservation tests)
- [ ] Supabase schema applied (`docs/supabase/schema.sql` + `migration-002-reservation-fields.sql`)
- [ ] `npm run verify:supabase` PASS locally with production credentials
- [ ] All secrets in Netlify dashboard (not in Git)
- [ ] `NEXT_PUBLIC_APP_URL` = `https://reliefhotelsandsuites.com.ng`

## Netlify setup

- [ ] Site connected to GitHub repo
- [ ] Build: `npm run build` · Node **20** (`netlify.toml`)
- [ ] Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_DASHBOARD_KEY`
- [ ] Redeploy after env changes

## Post-deploy smoke (15 min)

- [ ] `GET /api/health` → `productionReady: true`, `storage.connected: true`
- [ ] `/en` loads
- [ ] Full booking: property bar → rooms → book → pay demo → callback success
- [ ] POST reservation → row in Supabase (not ephemeral file store)
- [ ] `/en/staff?key=…` or `reservation.…?key=…` — reservations, payments, category badges, no marketing chrome
- [ ] Paystack callback URL matches `NEXT_PUBLIC_APP_URL` (when using live/test keys)

## Sign-off

| Role | Date |
|------|------|
| Tech Lead | |
| Kalu | |

Record in [deployment-history.md](deployment-history.md).
