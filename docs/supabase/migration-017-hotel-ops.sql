-- Migration 017: hotel operations (Phase 1) — run after 016. Safe to re-run.
--
-- 1. app_settings — small owner-edited JSON documents by key (room_setup, …),
--    read by src/lib/settings-store.ts. Room inventory is still mirrored into
--    room_inventory, which reserve_room() reads.
-- 2. room-photos storage bucket — public images uploaded from
--    /staff/settings/rooms (service role uploads; guests only read).

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

drop policy if exists "service_role_all_app_settings" on app_settings;
create policy "service_role_all_app_settings"
  on app_settings
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-photos', 'room-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 3. Room assignment: physical rooms per booking, e.g. {guest-room-3}
--    (unit ids follow room setup numbering; labels live in app_settings).
alter table reservations
  add column if not exists assigned_units text[];

-- 4. Invoices and credit notes (append-only).
alter table reservations
  add column if not exists quote_snapshot jsonb;

create table if not exists document_counters (
  series text primary key,
  last_value integer not null default 0
);

alter table document_counters enable row level security;

-- Atomic per-series counter: concurrent issuers get distinct numbers.
create or replace function next_document_number(p_series text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into document_counters (series, last_value) values (p_series, 1)
  on conflict (series) do update set last_value = document_counters.last_value + 1
  returning last_value;
$$;

revoke all on function next_document_number(text) from public, anon, authenticated;
grant execute on function next_document_number(text) to service_role;

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  kind text not null check (kind in ('invoice', 'credit_note')),
  reservation_id uuid not null references reservations (id),
  issued_at timestamptz not null default now(),
  due_at timestamptz not null,
  total_ngn integer not null,
  credit_for uuid unique references invoices (id),
  document jsonb not null,
  check ((kind = 'credit_note') = (credit_for is not null))
);

create index if not exists invoices_reservation_idx on invoices (reservation_id);

alter table invoices enable row level security;

drop policy if exists "service_role_all_invoices" on invoices;
create policy "service_role_all_invoices"
  on invoices
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

-- Issued documents are final: reverse with a credit note instead.
create or replace function invoices_are_final()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Invoices cannot be changed or deleted — issue a credit note';
end;
$$;

drop trigger if exists invoices_no_update on invoices;
create trigger invoices_no_update
  before update or delete on invoices
  for each row execute function invoices_are_final();

-- 5. Group bookings: room-type lines of one checkout share a group id.
alter table reservations
  add column if not exists group_id uuid;

create index if not exists reservations_group_idx
  on reservations (group_id)
  where group_id is not null;
