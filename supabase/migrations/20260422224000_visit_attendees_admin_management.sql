-- Allow admins to manage visit attendees manually.

drop policy if exists "visit_attendees_insert_admin" on public.visit_attendees;
create policy "visit_attendees_insert_admin" on public.visit_attendees
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "visit_attendees_delete_admin" on public.visit_attendees;
create policy "visit_attendees_delete_admin" on public.visit_attendees
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );
