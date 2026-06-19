-- Migration 003: allow service_role full access (seed script + API)
-- Run in Supabase SQL Editor if npm run seed:supabase:demo fails with RLS errors
-- while using the correct service_role key.

drop policy if exists "service_role_all_reservations" on reservations;
create policy "service_role_all_reservations"
  on reservations
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_all_payments" on payments;
create policy "service_role_all_payments"
  on payments
  as permissive
  for all
  to service_role
  using (true)
  with check (true);
