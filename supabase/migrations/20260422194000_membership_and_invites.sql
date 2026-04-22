-- Phase 2: invite-only membership + admin controls

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists is_member boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.invites enable row level security;

-- Profiles additional policies
create policy "profiles_select_all_members" on public.profiles
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()) );

-- Admins can manage profiles
create policy "profiles_admin_update_all" on public.profiles
  for update
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (true);

-- Invite policies
create policy "invites_select_own_or_admin" on public.invites
  for select
  using (
    lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "invites_insert_admin" on public.invites
  for insert
  with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "invites_update_admin_or_self_accept" on public.invites
  for update
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
    or lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  )
  with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
    or lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

create index if not exists idx_invites_email on public.invites (lower(email));
create index if not exists idx_profiles_member on public.profiles (is_member);
