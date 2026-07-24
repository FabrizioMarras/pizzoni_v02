-- Feedback board: members submit feedback/bug reports, everyone reads the full
-- list (with live status), only the author can edit their own content, only
-- admins set status/priority or delete entries.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_done boolean not null default false,
  priority text check (priority in ('high', 'mid', 'low')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_feedback_created_at on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "feedback_select_authenticated" on public.feedback;
create policy "feedback_select_authenticated" on public.feedback
  for select using (auth.role() = 'authenticated');

drop policy if exists "feedback_insert_self" on public.feedback;
create policy "feedback_insert_self" on public.feedback
  for insert with check (auth.uid() = author_id);

drop policy if exists "feedback_delete_admin" on public.feedback;
create policy "feedback_delete_admin" on public.feedback
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- No update policy: RLS is row-level, not column-level, so a plain "author can
-- update own row" policy would also let them edit status/priority. Every
-- mutation instead goes through one of the two RPCs below, each enforcing its
-- own column-level restriction.

create or replace function public.update_feedback_content(p_feedback_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.feedback
  set content = p_content, updated_at = timezone('utc'::text, now())
  where id = p_feedback_id and author_id = auth.uid();

  if not found then
    raise exception 'not_allowed';
  end if;
end;
$$;

create or replace function public.update_feedback_status(p_feedback_id uuid, p_is_done boolean, p_priority text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception 'not_allowed';
  end if;

  update public.feedback
  set is_done = p_is_done, priority = p_priority, updated_at = timezone('utc'::text, now())
  where id = p_feedback_id;

  if not found then
    raise exception 'feedback_not_found';
  end if;
end;
$$;

grant execute on function public.update_feedback_content(uuid, text) to authenticated;
grant execute on function public.update_feedback_status(uuid, boolean, text) to authenticated;
