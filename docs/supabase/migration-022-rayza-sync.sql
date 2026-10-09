-- Migration 022: RAYZA Connect sync status (feat/rayza-connect-v42).
-- Independent of earlier migrations' objects. Safe to re-run.

-- One row per reservation: what RAYZA HMS last accepted for it, so failed
-- pushes/cancels are visible to staff and retried by the scheduled sync.
create table if not exists rayza_sync (
  reservation_id text primary key,
  state text not null check (state in ('pushed', 'cancelled', 'failed')),
  -- What the reservation should be on RAYZA when this was written.
  wanted text not null check (wanted in ('booked', 'cancelled')),
  refs jsonb not null default '[]'::jsonb,
  code text,
  error text,
  attempts integer not null default 1,
  at timestamptz not null default now()
);
create index if not exists rayza_sync_at_idx on rayza_sync (at desc);

alter table rayza_sync enable row level security;
drop policy if exists "service_role_all_rayza_sync" on rayza_sync;
create policy "service_role_all_rayza_sync"
  on rayza_sync as permissive for all to service_role using (true) with check (true);
