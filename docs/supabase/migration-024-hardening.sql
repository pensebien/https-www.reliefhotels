-- Migration 024: production hardening (feat/phase-4-hardening). Safe to re-run.

-- 1. Shared rate-limit counters (staff login and dashboard-key guesses), so the
--    limit holds across every serverless instance, not just one.
create table if not exists rate_limit_counters (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);
alter table rate_limit_counters enable row level security;
drop policy if exists "service_role_all_rate_limit_counters" on rate_limit_counters;
create policy "service_role_all_rate_limit_counters"
  on rate_limit_counters as permissive for all to service_role using (true) with check (true);

-- Count a hit (p_increment) or just read, within a fixed window; returns the
-- count in the current window. Atomic: one statement per call.
create or replace function rate_limit_hit(p_key text, p_window_seconds integer, p_increment boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if p_increment then
    insert into rate_limit_counters as c (key, window_start, count)
    values (p_key, now(), 1)
    on conflict (key) do update
      set count = case when c.window_start < now() - make_interval(secs => p_window_seconds) then 1 else c.count + 1 end,
          window_start = case when c.window_start < now() - make_interval(secs => p_window_seconds) then now() else c.window_start end
    returning count into current_count;
  else
    select case when window_start < now() - make_interval(secs => p_window_seconds) then 0 else count end
      into current_count
      from rate_limit_counters where key = p_key;
  end if;
  return coalesce(current_count, 0);
end;
$$;
revoke all on function rate_limit_hit(text, integer, boolean) from public, anon, authenticated;
grant execute on function rate_limit_hit(text, integer, boolean) to service_role;

-- 2. Outbox for guest emails / manager alerts that failed to send; retried by
--    the scheduled job until they go out or give up.
create table if not exists notification_outbox (
  id uuid primary key,
  kind text not null,
  payload jsonb not null,
  attempts integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists notification_outbox_due_idx on notification_outbox (status, next_attempt_at);
alter table notification_outbox enable row level security;
drop policy if exists "service_role_all_notification_outbox" on notification_outbox;
create policy "service_role_all_notification_outbox"
  on notification_outbox as permissive for all to service_role using (true) with check (true);

-- 3. Health per integration area for Staff → System health: error count, last
--    error (secrets stripped), last success.
create table if not exists ops_status (
  scope text primary key,
  error_count integer not null default 0,
  last_error text,
  last_error_at timestamptz,
  last_ok_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table ops_status enable row level security;
drop policy if exists "service_role_all_ops_status" on ops_status;
create policy "service_role_all_ops_status"
  on ops_status as permissive for all to service_role using (true) with check (true);
