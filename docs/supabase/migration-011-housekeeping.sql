-- Migration 011: housekeeping — distinguish room blocks by type (Agent P)
-- Run in Supabase SQL Editor after prior migrations (needs migration-006).
--
-- Room blocks (migration-006-inventory.sql) already reduce bookable
-- inventory correctly; this just tags each block as a maintenance hold
-- or a housekeeping (post-checkout cleaning) hold, so the new
-- /staff/housekeeping dashboard can filter/label them. Existing rows
-- default to 'maintenance'.

alter table room_blocks
  add column if not exists block_type text not null default 'maintenance'
    check (block_type in ('maintenance', 'housekeeping'));

comment on column room_blocks.block_type is
  'maintenance = general hold; housekeeping = post-checkout cleaning hold — Agent P.';
