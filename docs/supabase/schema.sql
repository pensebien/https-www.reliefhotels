-- Relief Hotels — Supabase schema (ADR-001)
-- Run in Supabase SQL Editor after project creation.

create extension if not exists "pgcrypto";

-- Reservations (room booking requests)
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  check_in date,
  check_out date,
  room_id text,
  guests integer not null default 1,
  nights integer,
  item_type text not null default 'room'
    check (item_type in ('room', 'tour', 'inquiry')),
  payment_reference text,
  stay_preference text not null,
  message text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled')),
  source text not null default 'live'
    check (source in ('live', 'demo')),
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists reservations_created_at_idx
  on reservations (created_at desc);

-- Paystack payments
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  reservation_id uuid references reservations(id),
  email text not null,
  amount_kobo integer not null,
  currency text not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'success', 'failed', 'abandoned')),
  item_type text not null check (item_type in ('room', 'tour')),
  item_id text not null,
  item_label text not null,
  source text not null default 'live'
    check (source in ('live', 'demo')),
  created_at timestamptz not null default now()
);

create index if not exists payments_created_at_idx
  on payments (created_at desc);

-- Event inquiries
create table if not exists event_inquiries (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  event_type text not null,
  event_date text not null,
  guest_count text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Dining reservations
create table if not exists dining_reservations (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  venue text not null,
  reservation_date text not null,
  reservation_time text not null,
  party_size text not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Guest contact / feedback messages (not bookings — see migration-007)
create table if not exists guest_feedback (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists guest_feedback_created_at_idx
  on guest_feedback (created_at desc);

-- Optional: manager notification audit (KPI ≥95%)
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  reference_id text not null,
  channel text not null,
  success boolean not null,
  provider text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists notification_log_created_at_idx
  on notification_log (created_at desc);

-- RLS: service role bypasses; enable if using anon key later
alter table reservations enable row level security;
alter table payments enable row level security;
alter table event_inquiries enable row level security;
alter table dining_reservations enable row level security;
alter table guest_feedback enable row level security;
alter table notification_log enable row level security;

-- HMS Tier 1: staff notes on reservations
alter table reservations
  add column if not exists staff_notes text;

-- HMS Tier 2: room inventory and manual blocks
create table if not exists room_inventory (
  room_id text primary key,
  total_units integer not null check (total_units > 0),
  updated_at timestamptz not null default now()
);

create table if not exists room_blocks (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  check_in date not null,
  check_out date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (check_out > check_in)
);

create index if not exists room_blocks_room_dates_idx
  on room_blocks (room_id, check_in, check_out);

alter table room_inventory enable row level security;
alter table room_blocks enable row level security;

insert into room_inventory (room_id, total_units) values
  ('guest-room', 12),
  ('executive-room', 8),
  ('signature-suite', 4),
  ('presidential-suite', 1),
  ('executive-spa', 3)
on conflict (room_id) do nothing;

-- HMS: guest folio (minibar / F&B) — see migration-009-folio.sql
create table if not exists folio_charges (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations (id) on delete cascade,
  sku text not null,
  name text not null,
  qty integer not null check (qty > 0),
  unit_price_ngn integer not null check (unit_price_ngn >= 0),
  status text not null default 'open'
    check (status in ('open', 'posted', 'paid', 'void')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists folio_charges_reservation_id_idx
  on folio_charges (reservation_id);

alter table folio_charges enable row level security;
