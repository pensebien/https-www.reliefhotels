# ADR-004: Production hosting on Netlify

**Date:** 2026-06-02  
**Updated:** 2026-07-21  
**Status:** Accepted  
**Deciders:** Kalu, Tech Lead

## Context

**Phase 0:** Reliable public site for bookings.  
**Phase 1:** ngrok for demos; not production.  
**Constraint:** Need Next.js hosting, env secrets, and custom domain (`www` + staff subdomain).

## Decision

Deploy production Next.js app to **Netlify** (`@netlify/plugin-nextjs`). Connect custom domains via DNS (Notigori / Cloudflare). Use Supabase as the external Postgres store; set env vars in the Netlify UI.

## Options considered

| Option | Outcome |
|--------|---------|
| Netlify | ✅ Selected — domain already on Netlify; Next.js plugin; preview deploys |
| Other Node PaaS | Not selected |
| Vercel | Deferred by stakeholder |

## Consequences

- Configure via `netlify.toml` + Netlify UI (see `docs/deploy/NETLIFY.md`)  
- Set all vars from `docs/ENV_MATRIX.md` production row  
- Paystack callback URL = production site URL (`https://www.reliefhotelsandsuites.com/payment/callback`)  
- Staff subdomain: `reservation.reliefhotelsandsuites.com` (see `docs/deploy/STAFF.md`)

## Rollback

Netlify → Deploys → previous successful deploy → **Publish deploy**. DNS unchanged.
