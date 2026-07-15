-- HMS Tier 2 — room inventory and manual blocks

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

-- Seed default unit counts (matches mock inventory in room-availability.ts)
insert into room_inventory (room_id, total_units) values
  ('guest-room', 12),
  ('executive-room', 8),
  ('signature-suite', 4),
  ('presidential-suite', 1),
  ('executive-spa', 3)
on conflict (room_id) do nothing;
