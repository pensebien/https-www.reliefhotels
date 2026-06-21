-- Payment method metadata for front-desk (cash / Moniepoint) and online (Paystack)
alter table payments
  add column if not exists payment_method text,
  add column if not exists payment_channel text,
  add column if not exists external_reference text;

create index if not exists payments_payment_method_idx
  on payments (payment_method);
