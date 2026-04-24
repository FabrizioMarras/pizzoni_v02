-- Add explicit visit datetime and allow admins to update visit rows
-- (needed to set booking time after poll finalization).

alter table public.visits
  add column if not exists scheduled_at timestamp with time zone;

create index if not exists idx_visits_scheduled_at on public.visits (scheduled_at);

drop policy if exists "visits_update_admin" on public.visits;
create policy "visits_update_admin" on public.visits
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  )
  with check (true);
