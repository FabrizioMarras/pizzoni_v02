-- Agenda v2 (poll-first):
-- - Poll con owner
-- - Opzioni data
-- - Voti disponibilita
-- - Finalizzazione poll => crea pizzeria (se mancante) + visita

create table if not exists public.agenda_polls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  pizzeria_name text not null,
  location text not null,
  city text not null,
  notes text,
  final_option_id uuid,
  final_date date,
  finalized_at timestamp with time zone,
  finalized_by uuid references public.profiles(id) on delete set null,
  visit_id uuid references public.visits(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.agenda_poll_date_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.agenda_polls(id) on delete cascade not null,
  option_date date not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (poll_id, option_date)
);

create table if not exists public.agenda_poll_date_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.agenda_polls(id) on delete cascade not null,
  date_option_id uuid references public.agenda_poll_date_options(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  availability text not null check (availability in ('available', 'not_available')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (date_option_id, user_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agenda_polls_final_option_id_fkey'
  ) then
    alter table public.agenda_polls
      add constraint agenda_polls_final_option_id_fkey
      foreign key (final_option_id)
      references public.agenda_poll_date_options(id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_agenda_polls_status_created_at on public.agenda_polls (status, created_at desc);
create index if not exists idx_agenda_options_poll_date on public.agenda_poll_date_options (poll_id, option_date);
create index if not exists idx_agenda_votes_option_user on public.agenda_poll_date_votes (date_option_id, user_id);

alter table public.agenda_polls enable row level security;
alter table public.agenda_poll_date_options enable row level security;
alter table public.agenda_poll_date_votes enable row level security;

-- Agenda polls policies
drop policy if exists "agenda_polls_select_authenticated" on public.agenda_polls;
create policy "agenda_polls_select_authenticated" on public.agenda_polls
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "agenda_polls_insert_owner" on public.agenda_polls;
create policy "agenda_polls_insert_owner" on public.agenda_polls
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "agenda_polls_update_owner_or_admin" on public.agenda_polls;
create policy "agenda_polls_update_owner_or_admin" on public.agenda_polls
  for update
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    auth.uid() = owner_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "agenda_polls_delete_owner_or_admin" on public.agenda_polls;
create policy "agenda_polls_delete_owner_or_admin" on public.agenda_polls
  for delete
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Agenda date options policies
drop policy if exists "agenda_options_select_authenticated" on public.agenda_poll_date_options;
create policy "agenda_options_select_authenticated" on public.agenda_poll_date_options
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "agenda_options_insert_owner_or_admin" on public.agenda_poll_date_options;
create policy "agenda_options_insert_owner_or_admin" on public.agenda_poll_date_options
  for insert
  with check (
    exists (
      select 1
      from public.agenda_polls ap
      where ap.id = poll_id
        and (
          ap.owner_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
        )
    )
  );

drop policy if exists "agenda_options_update_owner_or_admin" on public.agenda_poll_date_options;
create policy "agenda_options_update_owner_or_admin" on public.agenda_poll_date_options
  for update
  using (
    exists (
      select 1
      from public.agenda_polls ap
      where ap.id = poll_id
        and (
          ap.owner_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.agenda_polls ap
      where ap.id = poll_id
        and (
          ap.owner_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
        )
    )
  );

drop policy if exists "agenda_options_delete_owner_or_admin" on public.agenda_poll_date_options;
create policy "agenda_options_delete_owner_or_admin" on public.agenda_poll_date_options
  for delete
  using (
    exists (
      select 1
      from public.agenda_polls ap
      where ap.id = poll_id
        and (
          ap.owner_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
        )
    )
  );

-- Agenda votes policies
drop policy if exists "agenda_votes_select_authenticated" on public.agenda_poll_date_votes;
create policy "agenda_votes_select_authenticated" on public.agenda_poll_date_votes
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "agenda_votes_insert_self" on public.agenda_poll_date_votes;
create policy "agenda_votes_insert_self" on public.agenda_poll_date_votes
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.agenda_poll_date_options ao
      join public.agenda_polls ap on ap.id = ao.poll_id
      where ao.id = date_option_id
        and ao.poll_id = poll_id
        and ap.status = 'open'
    )
  );

drop policy if exists "agenda_votes_update_self" on public.agenda_poll_date_votes;
create policy "agenda_votes_update_self" on public.agenda_poll_date_votes
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.agenda_poll_date_options ao
      join public.agenda_polls ap on ap.id = ao.poll_id
      where ao.id = date_option_id
        and ao.poll_id = poll_id
        and ap.status = 'open'
    )
  );

drop policy if exists "agenda_votes_delete_self" on public.agenda_poll_date_votes;
create policy "agenda_votes_delete_self" on public.agenda_poll_date_votes
  for delete
  using (auth.uid() = user_id);

create or replace function public.finalize_agenda_poll(p_poll_id uuid, p_option_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_is_admin boolean;
  v_poll public.agenda_polls%rowtype;
  v_option public.agenda_poll_date_options%rowtype;
  v_pizzeria_id uuid;
  v_visit_id uuid;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(p.is_admin, false)
  into v_is_admin
  from public.profiles p
  where p.id = v_uid;

  select *
  into v_poll
  from public.agenda_polls ap
  where ap.id = p_poll_id
  for update;

  if not found then
    raise exception 'poll_not_found';
  end if;

  if v_poll.status <> 'open' then
    raise exception 'poll_not_open';
  end if;

  if v_poll.owner_id <> v_uid and not coalesce(v_is_admin, false) then
    raise exception 'not_allowed';
  end if;

  select *
  into v_option
  from public.agenda_poll_date_options ao
  where ao.id = p_option_id
    and ao.poll_id = v_poll.id;

  if not found then
    raise exception 'option_not_found';
  end if;

  select p.id
  into v_pizzeria_id
  from public.pizzerias p
  where lower(p.name) = lower(v_poll.pizzeria_name)
    and lower(p.city) = lower(v_poll.city)
  order by p.created_at asc
  limit 1;

  if v_pizzeria_id is null then
    insert into public.pizzerias (name, location, city, created_by)
    values (v_poll.pizzeria_name, v_poll.location, v_poll.city, v_uid)
    returning id into v_pizzeria_id;
  end if;

  insert into public.visits (pizzeria_id, date, notes, created_by)
  values (
    v_pizzeria_id,
    v_option.option_date,
    nullif(trim(coalesce(v_poll.notes, '')), ''),
    v_uid
  )
  returning id into v_visit_id;

  insert into public.visit_attendees (visit_id, user_id)
  select v_visit_id, av.user_id
  from public.agenda_poll_date_votes av
  where av.date_option_id = v_option.id
    and av.availability = 'available'
  on conflict (visit_id, user_id) do nothing;

  update public.agenda_polls
  set
    status = 'closed',
    final_option_id = v_option.id,
    final_date = v_option.option_date,
    finalized_at = timezone('utc'::text, now()),
    finalized_by = v_uid,
    visit_id = v_visit_id
  where id = v_poll.id;

  return v_visit_id;
end;
$$;

grant execute on function public.finalize_agenda_poll(uuid, uuid) to authenticated;
