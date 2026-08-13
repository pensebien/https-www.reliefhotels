-- Migration 012: owner-editable VAT settings (Agent R)
-- Run in Supabase SQL Editor after prior migrations.
--
-- Single-row config table, mirrors src/lib/tax-settings.ts / data/tax-settings.json.
-- Default matches the current federal VAT rate; pass_through means the tax
-- is itemized on top of the guest's bill (the default) rather than folded
-- into the displayed price ("absorbed"). See ADR-009.

create table if not exists tax_settings (
  id integer primary key default 1,
  vat_percentage numeric(5, 2) not null default 7.5 check (vat_percentage >= 0 and vat_percentage <= 100),
  collection_mode text not null default 'pass_through' check (collection_mode in ('absorbed', 'pass_through')),
  updated_at timestamptz not null default now(),
  constraint tax_settings_singleton check (id = 1)
);

insert into tax_settings (id, vat_percentage, collection_mode)
values (1, 7.5, 'pass_through')
on conflict (id) do nothing;

comment on table tax_settings is
  'Single-row, owner-editable VAT rate + collection mode — Agent R, ADR-009.';

alter table tax_settings enable row level security;

drop policy if exists "service_role_all_tax_settings" on tax_settings;
create policy "service_role_all_tax_settings"
  on tax_settings
  as permissive
  for all
  to service_role
  using (true)
  with check (true);
