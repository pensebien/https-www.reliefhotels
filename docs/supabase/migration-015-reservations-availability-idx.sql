-- Index for the room availability lookup.
--
-- countOccupiedUnitsByRoom (src/lib/db/inventory-store.ts) asks Postgres for
-- every non-cancelled room reservation overlapping the searched dates:
--   item_type = 'room' and status <> 'cancelled'
--   and check_in < :checkOut and check_out > :checkIn
-- The only existing index is reservations_created_at_idx, which can't serve
-- that filter. This partial index matches the predicate exactly and carries
-- room_id so the query can be answered from the index alone.

create index if not exists reservations_room_availability_idx
  on reservations (check_in, check_out, room_id)
  where item_type = 'room' and status <> 'cancelled';
