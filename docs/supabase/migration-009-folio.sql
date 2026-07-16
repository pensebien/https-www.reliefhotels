-- Migration 009: guest folio — minibar / F&B / laundry / misc charges (Agent K, HMS F&B)
-- Run in Supabase SQL Editor after prior migrations.
--
-- Mirrors the file-store shape in `src/lib/folio/store.ts` /
-- `data/folio-charges.json`. `src/lib/folio/store.ts` activates this table
-- automatically once `isSupabaseEnabled()` is true (SUPABASE_URL +
-- SUPABASE_SERVICE_ROLE_KEY set); otherwise it stays on the JSON file store.

create table if not exists folio_charges (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations (id) on delete cascade,
  sku text not null,
  name text not null,
  qty integer not null check (qty > 0),
  unit_price_ngn integer not null check (unit_price_ngn >= 0),
  status text not null default 'open' check (status in ('open', 'posted', 'paid', 'void')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists folio_charges_reservation_id_idx
  on folio_charges (reservation_id);

create index if not exists folio_charges_status_idx
  on folio_charges (status);

comment on table folio_charges is
  'Guest folio charges (minibar / snacks / laundry / misc) posted by front desk / housekeeping, ADR pending — Agent K.';

-- Service-role only, same pattern as migration-003-service-role-policies.sql.
alter table folio_charges enable row level security;

drop policy if exists "service_role_all_folio_charges" on folio_charges;
create policy "service_role_all_folio_charges"
  on folio_charges
  as permissive
  for all
  to service_role
  using (true)
  with check (true);
