-- Migration 002: reservation booking fields + payment linkage
-- Run in Supabase SQL Editor on existing deployments created from schema v1.

alter table reservations add column if not exists phone text;
alter table reservations add column if not exists check_in date;
alter table reservations add column if not exists check_out date;
alter table reservations add column if not exists room_id text;
alter table reservations add column if not exists guests integer not null default 1;
alter table reservations add column if not exists nights integer;
alter table reservations add column if not exists item_type text not null default 'room';
alter table reservations add column if not exists payment_reference text;

alter table reservations drop constraint if exists reservations_item_type_check;
alter table reservations
  add constraint reservations_item_type_check
  check (item_type in ('room', 'tour', 'inquiry'));

alter table payments add column if not exists reservation_id uuid references reservations(id);
