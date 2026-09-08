-- Allow "checked_out" as a valid reservations.status value.
--
-- The staff "Check out" flow (StaffReservationActions' "Check out" button on
-- /staff/calendar, handled by src/app/api/demo/reservations/[id]/route.ts)
-- has shipped code that writes status = 'checked_out' — the Zod patch schema
-- (src/lib/schemas/staff-reservation-patch.ts) and the checkout API route
-- both support it, and it drives the auto-created housekeeping room block.
-- But the original constraint from schema.sql only ever allowed
-- ('pending', 'confirmed', 'cancelled'), so every checkout against a real
-- Supabase-backed deployment fails with:
--   new row for relation "reservations" violates check constraint
--   "reservations_status_check"
-- Found via tests/e2e/booking-stay-lifecycle.spec.ts, which exercises the
-- full guest-booking -> cashier-settle -> checkout -> housekeeping lifecycle
-- against a real Supabase project. tests/api/staff-checkout.test.ts never
-- caught this because it forces file-based storage (deletes SUPABASE_URL /
-- SUPABASE_SERVICE_ROLE_KEY before running), bypassing this constraint
-- entirely.

alter table reservations drop constraint if exists reservations_status_check;

alter table reservations
  add constraint reservations_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'checked_out'));
