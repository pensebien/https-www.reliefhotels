-- Migration 021: calendar sync and no-contract extras (feat/no-contract-extras).
-- Run after 020. Safe to re-run.

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
