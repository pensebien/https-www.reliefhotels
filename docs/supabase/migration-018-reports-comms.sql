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

-- 3. Online check-in. ID photos live in a PRIVATE bucket; staff read them
--    through an authenticated route. ID number and photo are purged after
--    the retention period by the daily job.
create table if not exists online_checkins (
  reservation_id uuid primary key references reservations (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  arrival_time text not null,
  nationality text not null,
  address text not null,
  purpose_of_stay text not null,
  id_type text not null,
  id_number text,
  id_photo_path text,
  id_photo_content_type text,
  purged_at timestamptz
);

alter table online_checkins enable row level security;

drop policy if exists "service_role_all_online_checkins" on online_checkins;
create policy "service_role_all_online_checkins"
  on online_checkins
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guest-ids', 'guest-ids', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
