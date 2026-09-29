-- Migration 016: booking engine (Sirvoy parity)
-- Run in Supabase SQL Editor after prior migrations. Safe to re-run.
--
-- 1. booking_engine_settings — one owner-editable JSON document holding the
--    RateConfig (src/lib/booking-engine/rate-config.ts): per-room rates and
--    restrictions, seasons, long-stay discounts, coupons, extras, deposit %,
--    payment-hold minutes, cancellation policy. Validated by zod on write;
--    edited from /staff/settings/rates. Missing row = neutral defaults.
-- 2. reservations — rooms per booking, coupon/extras, the price locked at
--    booking time, payment hold expiry, cancellation timestamp.
-- 3. reserve_room() — availability check + insert in one transaction under a
--    per-room advisory lock, so two guests can't both take the last room.
--
-- The app runs before this migration is applied (falls back to defaults and
-- the old check-then-insert path), but apply it before relying on holds,
-- coupons or multi-room bookings.

create table if not exists booking_engine_settings (
  id integer primary key default 1,
  config jsonb not null,
  updated_at timestamptz not null default now(),
  constraint booking_engine_settings_singleton check (id = 1)
);

alter table booking_engine_settings enable row level security;

drop policy if exists "service_role_all_booking_engine_settings" on booking_engine_settings;
create policy "service_role_all_booking_engine_settings"
  on booking_engine_settings
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

comment on table booking_engine_settings is
  'Single-row booking-engine RateConfig (rates, restrictions, coupons, extras, policies).';

alter table reservations
  add column if not exists units integer not null default 1 check (units between 1 and 10),
  add column if not exists coupon_code text,
  add column if not exists extra_ids text[],
  add column if not exists quoted_total_ngn integer check (quoted_total_ngn >= 0),
  add column if not exists quoted_deposit_ngn integer check (quoted_deposit_ngn >= 0),
  add column if not exists hold_expires_at timestamptz,
  add column if not exists cancelled_at timestamptz;

create index if not exists reservations_coupon_code_idx
  on reservations (coupon_code)
  where coupon_code is not null;

-- Returns the inserted row, or no row when the room type is sold out.
create or replace function reserve_room(
  p_reservation jsonb,
  p_default_inventory integer default 1
)
returns setof reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room text := p_reservation->>'room_id';
  v_check_in date := (p_reservation->>'check_in')::date;
  v_check_out date := (p_reservation->>'check_out')::date;
  v_units integer := coalesce((p_reservation->>'units')::integer, 1);
  v_total integer;
  v_used integer;
  v_blocked integer;
begin
  if v_room is null or v_check_in is null or v_check_out is null
     or v_check_out <= v_check_in then
    raise exception 'reserve_room: room_id, check_in < check_out required';
  end if;

  -- Serialize bookings per room type for the rest of this transaction.
  perform pg_advisory_xact_lock(hashtext('reserve_room:' || v_room));

  select total_units into v_total from room_inventory where room_id = v_room;
  v_total := coalesce(v_total, p_default_inventory);

  -- Same rule as holdsInventory() in src/lib/demo-store.ts.
  select coalesce(sum(coalesce(units, 1)), 0) into v_used
  from reservations
  where item_type = 'room'
    and room_id = v_room
    and status <> 'cancelled'
    and (status <> 'pending' or hold_expires_at is null or hold_expires_at > now())
    and check_in < v_check_out
    and check_out > v_check_in;

  select count(*) into v_blocked
  from room_blocks
  where room_id = v_room
    and check_in < v_check_out
    and check_out > v_check_in;

  if v_used + v_blocked + v_units > v_total then
    return;
  end if;

  return query
  insert into reservations (
    first_name, last_name, email, phone, check_in, check_out, room_id,
    guests, nights, item_type, payment_reference, stay_preference, message,
    status, source, email_sent, units, coupon_code, extra_ids,
    quoted_total_ngn, quoted_deposit_ngn, hold_expires_at
  )
  values (
    p_reservation->>'first_name',
    p_reservation->>'last_name',
    p_reservation->>'email',
    p_reservation->>'phone',
    v_check_in,
    v_check_out,
    v_room,
    coalesce((p_reservation->>'guests')::integer, 1),
    (p_reservation->>'nights')::integer,
    coalesce(p_reservation->>'item_type', 'room'),
    p_reservation->>'payment_reference',
    p_reservation->>'stay_preference',
    p_reservation->>'message',
    coalesce(p_reservation->>'status', 'pending'),
    coalesce(p_reservation->>'source', 'live'),
    coalesce((p_reservation->>'email_sent')::boolean, false),
    v_units,
    p_reservation->>'coupon_code',
    case
      when jsonb_typeof(p_reservation->'extra_ids') = 'array'
      then array(select jsonb_array_elements_text(p_reservation->'extra_ids'))
    end,
    (p_reservation->>'quoted_total_ngn')::integer,
    (p_reservation->>'quoted_deposit_ngn')::integer,
    (p_reservation->>'hold_expires_at')::timestamptz
  )
  returning *;
end;
$$;

revoke all on function reserve_room(jsonb, integer) from public, anon, authenticated;
grant execute on function reserve_room(jsonb, integer) to service_role;
