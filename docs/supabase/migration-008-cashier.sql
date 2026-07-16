-- Migration 008: cashier settle — Paystack Terminal + idempotent client mutations
-- ADR-005. Run in Supabase SQL Editor after prior migrations.

-- Allow paystack_terminal on payments.payment_method (alongside cash / moniepoint / paystack)
-- Existing check constraints vary by environment; use soft add via text + app validation.

alter table payments
  add column if not exists client_mutation_id text;

create unique index if not exists payments_client_mutation_id_uidx
  on payments (client_mutation_id)
  where client_mutation_id is not null;

comment on column payments.client_mutation_id is
  'Idempotency key for cashier offline/outbox settle (ADR-005)';

-- Optional: terminal / provider metadata for cashier settles
alter table payments
  add column if not exists provider_terminal_id text;

alter table payments
  add column if not exists offline_reference text;
