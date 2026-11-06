-- Manual bank-transfer flow: guest WhatsApp number + who confirmed the transfer.
-- Safe to re-run. Code tolerates this migration being absent only in file mode.

alter table reservations add column if not exists whatsapp_number text;
alter table reservations add column if not exists payment_mode text
  check (payment_mode is null or payment_mode in ('card', 'transfer'));
alter table reservations add column if not exists moniepoint_payment_ref text;
alter table reservations add column if not exists payment_confirmed_by text;
alter table reservations add column if not exists payment_confirmed_at timestamptz;

-- A Moniepoint reference can confirm only one booking.
create unique index if not exists reservations_moniepoint_ref_uniq
  on reservations (moniepoint_payment_ref) where moniepoint_payment_ref is not null;
