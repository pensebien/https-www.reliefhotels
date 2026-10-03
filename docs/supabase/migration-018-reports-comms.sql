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
