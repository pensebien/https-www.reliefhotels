-- Migration 007: guest feedback / contact messages (separate from bookings)
-- Run in Supabase SQL Editor after schema.sql baseline.

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

alter table guest_feedback enable row level security;

drop policy if exists "service_role_all_guest_feedback" on guest_feedback;
create policy "service_role_all_guest_feedback"
  on guest_feedback
  as permissive
  for all
  to service_role
  using (true)
  with check (true);
