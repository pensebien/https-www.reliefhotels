# ADR-004: Production hosting on Render

**Date:** 2026-06-02  
**Status:** Accepted  
**Deciders:** Kalu, Tech Lead

## Context

**Phase 0:** Reliable public site for bookings.  
**Phase 1:** ngrok for demos; not production.  
**Constraint:** Vercel deferred; need Node runtime + env secrets + custom domain.

## Decision

Deploy production Next.js app to **Render** (Web Service). Connect custom domain via DNS (Notigori). Use Supabase `DATABASE_URL` in Render environment.

## Options considered

| Option | Outcome |
|--------|---------|
| Render | ✅ Selected — Node, straightforward env, pairs with Supabase |
| Netlify | Not selected |
| Vercel | Deferred by stakeholder |

## Consequences

- Configure build: `npm run build`, start: `npm start`  
- Set all vars from `docs/ENV_MATRIX.md` production row  
- Paystack callback URL = Render production URL  

## Rollback

Redeploy previous Render release; DNS unchanged.
