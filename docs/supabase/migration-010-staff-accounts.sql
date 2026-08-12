-- Migration 010: staff accounts — real per-staff identity/RBAC (Agent O)
-- Run in Supabase SQL Editor after prior migrations.
--
-- Mirrors the file-store shape in `src/lib/staff-accounts.ts` /
-- `data/staff-accounts.json`. That module activates this table
-- automatically once `isSupabaseEnabled()` is true (SUPABASE_URL +
-- SUPABASE_SERVICE_ROLE_KEY set); otherwise it stays on the JSON file store.
--
-- Replaces the single shared DEMO_DASHBOARD_KEY gate on /api/staff/* once
-- STAFF_AUTH_ENABLED=true — see ADR-007-staff-identity-rbac.md.

create table if not exists staff_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  role text not null check (role in ('cashier', 'manager', 'restaurant_owner', 'cleaner_head')),
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists staff_accounts_role_idx on staff_accounts (role);

comment on table staff_accounts is
  'Per-staff login (name + PIN) and role, replacing the shared DEMO_DASHBOARD_KEY — Agent O.';

-- Service-role only, same pattern as migration-003-service-role-policies.sql.
alter table staff_accounts enable row level security;

drop policy if exists "service_role_all_staff_accounts" on staff_accounts;
create policy "service_role_all_staff_accounts"
  on staff_accounts
  as permissive
  for all
  to service_role
  using (true)
  with check (true);
