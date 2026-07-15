-- Staff notes on reservations (HMS Tier 1)
alter table reservations
  add column if not exists staff_notes text;
