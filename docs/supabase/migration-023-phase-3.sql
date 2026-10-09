-- Migration 023: Phase 3 parity (feat/phase-3-parity). Safe to re-run.

-- Staff tags on bookings (e.g. "VIP", "late arrival"), filterable in the bookings list.
alter table reservations add column if not exists tags text[];
create index if not exists reservations_tags_idx on reservations using gin (tags);
