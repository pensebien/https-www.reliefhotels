-- Migration 018: reports and guest communication (Phase 2) — run after 017.
-- Safe to re-run.

-- 1. Where each booking was made, for reports by source. Older rows stay
--    null and are inferred from the walk-in note (bookingChannelOf()).
alter table reservations
  add column if not exists booking_channel text
    check (booking_channel in ('online', 'desk'));

create index if not exists reservations_created_at_room_idx
  on reservations (created_at)
  where item_type = 'room';

-- 2. Scheduled guest messages: one row per (template, booking), claimed
--    before sending so overlapping runs can't double-send.
create table if not exists guest_message_log (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  reservation_id uuid not null references reservations (id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  recipient text not null,
  status text not null check (status in ('sending', 'sent', 'failed', 'not_configured')),
  created_at timestamptz not null default now(),
  unique (template_id, reservation_id)
);

create index if not exists guest_message_log_created_idx
  on guest_message_log (created_at desc);

alter table guest_message_log enable row level security;

drop policy if exists "service_role_all_guest_message_log" on guest_message_log;
create policy "service_role_all_guest_message_log"
  on guest_message_log
  as permissive
  for all
  to service_role
  using (true)
  with check (true);
