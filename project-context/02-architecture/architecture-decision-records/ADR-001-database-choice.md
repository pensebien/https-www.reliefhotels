# ADR-001: Production persistence — Supabase PostgreSQL vs file store

**Date:** 2026-06-02  
**Status:** Accepted  
**Deciders:** Kalu, Tech Lead

## Context

**Phase 0:** 100% reservation traceability; 20 paid bookings/month.  
**Phase 1:** File-based `demo-store.json` and `inquiries.json` work locally and on ngrok but **fail on ephemeral serverless** (writes lost between invocations).  
**Technical challenge:** Durable, queryable storage without exceeding ops budget.

## Decision

**Adopt Supabase PostgreSQL for production**; retain file stores only for local/ngrok demo.

Implement a thin repository layer so Route Handlers call `ReservationRepository.create()` rather than `fs` directly.

## Options considered

### Option 1: JSON files on disk

**Pros:** Zero setup; already implemented  
**Cons:** Unreliable on Render/Netlify serverless; no concurrent write safety; weak reporting  
**Complexity:** Low  
**Cost:** N0

### Option 2: Supabase PostgreSQL ✅ Selected

**Pros:** Durable Postgres, dashboard, optional auth/storage later, fits NFR-A3  
**Cons:** Migration effort; RLS policies if using client SDK (we use server-only `DATABASE_URL`)  
**Complexity:** Medium  
**Cost:** Free tier → paid as volume grows

### Option 3: Neon PostgreSQL

**Pros:** Serverless-friendly connection pooling  
**Cons:** Not selected — sponsor chose Supabase  
**Complexity:** Medium

## Rationale

File store validated prototyping only. Primary KPI and success metric #4 require **guaranteed persistence**. Supabase provides managed Postgres with `DATABASE_URL` on **Render**; server-only access from Route Handlers (Drizzle or `@supabase/supabase-js` server client optional).

## How this serves Phase 0

Enables trustworthy booking history for operations and paid-booking counting toward **20/month**.

## Consequences

**Positive:**

- Reliable production bookings  
- Single source for demo dashboard queries in prod  

**Negative:**

- Migration script + dual-write period during agent work  
- **Mitigation:** Agent D implements repository + schema  

## Success criteria

- Zero lost reservations after 7-day production soak  
- Paystack `reference` unique in `payments` table  

## Rollback

Revert to previous deploy; export Postgres CSV for manual recovery. Do not return to file store in production.

## Schema sketch (v1)

```sql
-- reservations, payments, event_inquiries, dining_reservations
-- notification_log (optional, Phase 4)
```

**Signed off:** Supabase Postgres (2026-06-02).
