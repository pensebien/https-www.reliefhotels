# Deployment Checklist — Render + Supabase

**Target:** Production per ADR-004, ADR-001  
**Env reference:** `docs/ENV_MATRIX.md`  
**Full guide:** `docs/deploy/RENDER.md` · optional `render.yaml` blueprint

## Pre-deploy

- [ ] `npm run lint` PASS
- [ ] `npm run build` PASS on `main`
- [ ] Supabase schema applied (`docs/supabase/schema.sql`)
- [ ] All secrets in Render dashboard (not in Git)
- [ ] Paystack **live** keys (when going live)
- [ ] `NEXT_PUBLIC_APP_URL` = production HTTPS URL

## Render setup

- [ ] Web Service created; repo connected
- [ ] Build: `npm install && npm run build`
- [ ] Start: `npm start`
- [ ] Node version ≥ 20
- [ ] Environment variables copied from ENV_MATRIX production row

## Post-deploy smoke (15 min)

- [ ] `/en` loads
- [ ] POST `/api/reservations` → row in Supabase
- [ ] Paystack test transaction (live or test per env)
- [ ] Manager SMS + WhatsApp test with `NOTIFY_CHANNEL=both`
- [ ] `/demo?key=` works with production key
- [ ] Paystack callback URL matches `NEXT_PUBLIC_APP_URL`

## DNS

- [ ] Custom domain CNAME to Render
- [ ] SSL certificate active

## Sign-off

| Role | Date |
|------|------|
| Tech Lead | |
| Kalu | |

Record in [deployment-history.md](deployment-history.md).
