-- Migration 021: calendar sync and no-contract extras (feat/no-contract-extras).
-- Independent of 020 (creates none of its objects), so it can run before or after it. Safe to re-run.

-- 1. iCal channel blocks: bookings imported from OTA calendar feeds become
--    room blocks tagged with their feed (source) and the OTA event UID.
alter table room_blocks drop constraint if exists room_blocks_block_type_check;
alter table room_blocks
  add constraint room_blocks_block_type_check
  check (block_type in ('maintenance', 'housekeeping', 'channel'));

alter table room_blocks
  add column if not exists source text,
  add column if not exists external_uid text;

create index if not exists room_blocks_source_idx on room_blocks (source) where source is not null;

-- 2. Guest profiles: staff-kept tags, company, notes and blocked flag per
--    guest email (stays and spend are derived from reservations).
create table if not exists guest_profiles (
  email text primary key check (email = lower(email)),
  tags text[] not null default '{}',
  company text not null default '',
  notes text not null default '',
  blocked boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table guest_profiles enable row level security;

drop policy if exists "service_role_all_guest_profiles" on guest_profiles;
create policy "service_role_all_guest_profiles"
  on guest_profiles as permissive for all to service_role using (true) with check (true);

-- 3. Answers to staff-defined booking questions (custom fields).
alter table reservations
  add column if not exists custom_fields jsonb;

-- 4. Booking webhook delivery log (endpoints themselves live in app_settings).
create table if not exists webhook_deliveries (
  id uuid primary key,
  webhook_id text not null,
  event text not null,
  status text not null check (status in ('sent', 'failed')),
  http_status integer,
  error text,
  at timestamptz not null default now(),
  body text not null
);

create index if not exists webhook_deliveries_at_idx on webhook_deliveries (at desc);

alter table webhook_deliveries enable row level security;

drop policy if exists "service_role_all_webhook_deliveries" on webhook_deliveries;
create policy "service_role_all_webhook_deliveries"
  on webhook_deliveries as permissive for all to service_role using (true) with check (true);
