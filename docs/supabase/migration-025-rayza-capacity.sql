-- Migration 025: RAYZA-capped booking holds (feat/rayza-simple-site).
-- Safe to re-run. Needs migration 016 (units / hold columns on reservations).
--
-- RAYZA is the source of truth for free rooms. Paid bookings are already in
-- RAYZA's free count; unpaid website holds are not. So a new online booking
-- fits when the active unpaid holds for its room type and dates, plus its
-- own units, are within what RAYZA says is free (p_capacity). The check and
-- insert run under a per-room-type lock so two guests can't both take the
-- last room between RAYZA's answer and the insert.

create or replace function reserve_room_capped(
  p_reservation jsonb,
  p_capacity integer
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
  v_held integer;
begin
  if v_room is null or v_check_in is null or v_check_out is null
     or v_check_out <= v_check_in then
    raise exception 'reserve_room_capped: room_id, check_in < check_out required';
  end if;

  perform pg_advisory_xact_lock(hashtext('reserve_room:' || v_room));

  -- Same rule as isUnpaidHold() in src/lib/booking-engine/holds.ts.
  select coalesce(sum(coalesce(units, 1)), 0) into v_held
  from reservations
  where item_type = 'room'
    and room_id = v_room
    and status = 'pending'
    and (hold_expires_at is null or hold_expires_at > now())
    and check_in < v_check_out
    and check_out > v_check_in;

  if v_held + v_units > p_capacity then
    return;
  end if;

  return query
  insert into reservations (
    first_name, last_name, email, phone, check_in, check_out, room_id,
    guests, nights, item_type, payment_reference, stay_preference, message,
    status, source, email_sent, units, quoted_total_ngn, quoted_deposit_ngn,
    hold_expires_at
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
    (p_reservation->>'quoted_total_ngn')::integer,
    (p_reservation->>'quoted_deposit_ngn')::integer,
    (p_reservation->>'hold_expires_at')::timestamptz
  )
  returning *;
end;
$$;

revoke all on function reserve_room_capped(jsonb, integer) from public, anon, authenticated;
grant execute on function reserve_room_capped(jsonb, integer) to service_role;
