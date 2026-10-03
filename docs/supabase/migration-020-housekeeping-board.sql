-- Migration 020: housekeeping board (feat/sirvoy-parity) — run after 018.
-- Safe to re-run. Per-room clean/dirty status and the daily task log.

create table if not exists room_status (
  unit_id text primary key,
  status text not null check (status in ('clean', 'dirty')),
  block_id uuid,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists housekeeping_task_log (
  unit_id text not null,
  task_id text not null,
  date date not null,
  done_at timestamptz not null default now(),
  done_by text,
  primary key (unit_id, task_id, date)
);

alter table room_status enable row level security;
alter table housekeeping_task_log enable row level security;

drop policy if exists "service_role_all_room_status" on room_status;
create policy "service_role_all_room_status"
  on room_status as permissive for all to service_role using (true) with check (true);

drop policy if exists "service_role_all_housekeeping_task_log" on housekeeping_task_log;
create policy "service_role_all_housekeeping_task_log"
  on housekeeping_task_log as permissive for all to service_role using (true) with check (true);
