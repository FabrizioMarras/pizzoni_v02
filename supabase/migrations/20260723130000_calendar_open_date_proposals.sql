-- Allow any authenticated participant to propose a date option on an open
-- poll, not just the poll owner/admin, so the calendar-based availability
-- picker can let everyone add their own free dates.

drop policy if exists "agenda_options_insert_owner_or_admin" on public.agenda_poll_date_options;
create policy "agenda_options_insert_participant" on public.agenda_poll_date_options
  for insert
  with check (
    exists (
      select 1 from public.agenda_polls ap
      where ap.id = poll_id and ap.status = 'open'
    )
  );
