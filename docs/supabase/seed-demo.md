# Supabase demo seed data

Load **78 demo reservations** and **48 payments** into production Supabase for Kalu’s staff portal demos. All rows use `source = 'demo'` so they can be removed without touching live bookings.

## Prerequisites

1. **Service role key** in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`  
   (Supabase → Settings → API → `service_role` → Reveal — **not** the anon/publishable key)

2. If seed fails with **RLS policy** error, run once in SQL Editor:

   `docs/supabase/migration-003-service-role-policies.sql`

## Seed (first time or refresh)

```bash
# Requires .env.local with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm run seed:supabase:demo -- --fresh
```

| Flag | Effect |
|------|--------|
| *(none)* | Upsert demo rows (merge on `id` / payment `reference`) |
| `--fresh` | Delete existing `source = demo` rows, then insert |

## Verify in staff portal

```text
https://reservation.reliefhotelsandsuites.com?key=relief-demo-2026
```

Set date filter to **All dates** to see the full demo set.

## Clean up before go-live

```bash
npm run clean:supabase:demo
```

Deletes all rows where `source = 'demo'` from `payments` then `reservations`.

## SQL alternative (Supabase SQL Editor)

```sql
delete from payments where source = 'demo';
delete from reservations where source = 'demo';
```

## Notes

- Live bookings use `source = 'live'` and are **not** affected by clean.
- With Supabase enabled, the app reads **only from the database** (no duplicate in-memory merge).
- Without Supabase (local file store), in-memory demo seeds still apply from `demo-seed-generator.ts`.
