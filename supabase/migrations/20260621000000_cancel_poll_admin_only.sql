-- Restrict agenda_polls deletion to admin only, and only for open polls.
-- Previously: owner or admin could delete any poll.
-- Now: only admin can delete, and only while the poll is still open.

drop policy if exists "agenda_polls_delete_owner_or_admin" on public.agenda_polls;

create policy "agenda_polls_delete_admin_only" on public.agenda_polls
  for delete
  using (
    status = 'open'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
