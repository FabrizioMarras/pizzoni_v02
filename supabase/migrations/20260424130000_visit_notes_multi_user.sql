-- Multi-user event notes.
-- Any authenticated member can add notes to an event.
-- Only the note author can edit/delete their own note.

create table if not exists public.visit_notes (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references public.visits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_visit_notes_visit_created_at on public.visit_notes (visit_id, created_at desc);
create index if not exists idx_visit_notes_user on public.visit_notes (user_id);

alter table public.visit_notes enable row level security;

drop policy if exists "visit_notes_select_authenticated" on public.visit_notes;
create policy "visit_notes_select_authenticated" on public.visit_notes
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "visit_notes_insert_self" on public.visit_notes;
create policy "visit_notes_insert_self" on public.visit_notes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "visit_notes_update_self" on public.visit_notes;
create policy "visit_notes_update_self" on public.visit_notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "visit_notes_delete_self" on public.visit_notes;
create policy "visit_notes_delete_self" on public.visit_notes
  for delete
  using (auth.uid() = user_id);

-- Optional backfill: move existing single-note visit text into the new notes table.
insert into public.visit_notes (visit_id, user_id, content, created_at, updated_at)
select v.id, v.created_by, trim(v.notes), v.created_at, v.created_at
from public.visits v
where v.notes is not null
  and char_length(trim(v.notes)) > 0
  and not exists (
    select 1
    from public.visit_notes n
    where n.visit_id = v.id
      and n.user_id = v.created_by
      and n.content = trim(v.notes)
  );
