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
alter table notification_log enable row level security;
