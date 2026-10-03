-- Migration 019: saved cards (optional, feat/saved-cards) — run after 018.
-- Safe to re-run.
--
-- Paystack's reusable authorization token only (never card numbers), kept
-- when the guest consented at checkout; deleted after the retention period
-- by the daily job.

alter table reservations
  add column if not exists card_consent boolean;

create table if not exists saved_cards (
  reservation_id uuid primary key references reservations (id) on delete cascade,
  email text not null,
  authorization_code text not null,
  brand text not null,
  last4 text not null,
  exp_month text not null,
  exp_year text not null,
  bank text,
  created_at timestamptz not null default now()
);

alter table saved_cards enable row level security;

drop policy if exists "service_role_all_saved_cards" on saved_cards;
create policy "service_role_all_saved_cards"
  on saved_cards
  as permissive
  for all
  to service_role
  using (true)
  with check (true);
