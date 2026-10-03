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
