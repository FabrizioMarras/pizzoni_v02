create extension if not exists pgcrypto;

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  name text,
  avatar_url text,
  pizza_emoji text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Pizzerias table
create table public.pizzerias (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  location text not null,
  city text not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Visits table
create table public.visits (
  id uuid default gen_random_uuid() primary key,
  pizzeria_id uuid references public.pizzerias(id) on delete cascade not null,
  date date not null,
  notes text,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Attendees (many-to-many for visits and users)
create table public.visit_attendees (
  id uuid default gen_random_uuid() primary key,
  visit_id uuid references public.visits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  unique(visit_id, user_id)
);

-- Reviews table
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  visit_id uuid references public.visits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  pizza_quality integer check (pizza_quality >= 0 and pizza_quality <= 10),
  ambience integer check (ambience >= 0 and ambience <= 10),
  service integer check (service >= 0 and service <= 10),
  value integer check (value >= 0 and value <= 10),
  final_score float generated always as (
    (coalesce(pizza_quality, 0) + coalesce(ambience, 0) + coalesce(service, 0) + coalesce(value, 0)) / nullif(
      (case when pizza_quality is not null then 1 else 0 end +
       case when ambience is not null then 1 else 0 end +
       case when service is not null then 1 else 0 end +
       case when value is not null then 1 else 0 end), 0
    )
  ) stored,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(visit_id, user_id)
);

-- Photos table
create table public.photos (
  id uuid default gen_random_uuid() primary key,
  visit_id uuid references public.visits(id) on delete cascade not null,
  url text not null,
  is_pizza_of_night boolean default false,
  uploaded_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Upcoming visits
create table public.upcoming_visits (
  id uuid default gen_random_uuid() primary key,
  pizzeria_name text not null,
  address text not null,
  date timestamp with time zone not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.rsvps (
  id uuid default gen_random_uuid() primary key,
  upcoming_visit_id uuid references public.upcoming_visits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('coming', 'not_coming')),
  unique(upcoming_visit_id, user_id)
);

-- Polls for next restaurant
create table public.poll_suggestions (
  id uuid default gen_random_uuid() primary key,
  suggested_by uuid references public.profiles(id) on delete cascade not null,
  pizzeria_name text not null,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.poll_votes (
  id uuid default gen_random_uuid() primary key,
  suggestion_id uuid references public.poll_suggestions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  vote text check (vote in ('up', 'down')),
  unique(suggestion_id, user_id)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.pizzerias enable row level security;
alter table public.visits enable row level security;
alter table public.visit_attendees enable row level security;
alter table public.reviews enable row level security;
alter table public.photos enable row level security;
alter table public.upcoming_visits enable row level security;
alter table public.rsvps enable row level security;
alter table public.poll_suggestions enable row level security;
alter table public.poll_votes enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

-- Pizzerias policies
drop policy if exists "pizzerias_select_authenticated" on public.pizzerias;
create policy "pizzerias_select_authenticated" on public.pizzerias
  for select using (auth.role() = 'authenticated');

drop policy if exists "pizzerias_insert_owner" on public.pizzerias;
create policy "pizzerias_insert_owner" on public.pizzerias
  for insert with check (auth.uid() = created_by);

drop policy if exists "pizzerias_update_owner" on public.pizzerias;
create policy "pizzerias_update_owner" on public.pizzerias
  for update using (auth.uid() = created_by);

drop policy if exists "pizzerias_delete_owner" on public.pizzerias;
create policy "pizzerias_delete_owner" on public.pizzerias
  for delete using (auth.uid() = created_by);

-- Visits policies
drop policy if exists "visits_select_authenticated" on public.visits;
create policy "visits_select_authenticated" on public.visits
  for select using (auth.role() = 'authenticated');

drop policy if exists "visits_insert_owner" on public.visits;
create policy "visits_insert_owner" on public.visits
  for insert with check (auth.uid() = created_by);

drop policy if exists "visits_update_owner" on public.visits;
create policy "visits_update_owner" on public.visits
  for update using (auth.uid() = created_by);

drop policy if exists "visits_delete_owner" on public.visits;
create policy "visits_delete_owner" on public.visits
  for delete using (auth.uid() = created_by);

-- Visit attendees policies
drop policy if exists "visit_attendees_select_authenticated" on public.visit_attendees;
create policy "visit_attendees_select_authenticated" on public.visit_attendees
  for select using (auth.role() = 'authenticated');

drop policy if exists "visit_attendees_insert_self" on public.visit_attendees;
create policy "visit_attendees_insert_self" on public.visit_attendees
  for insert with check (auth.uid() = user_id);

drop policy if exists "visit_attendees_update_self" on public.visit_attendees;
create policy "visit_attendees_update_self" on public.visit_attendees
  for update using (auth.uid() = user_id);

drop policy if exists "visit_attendees_delete_self" on public.visit_attendees;
create policy "visit_attendees_delete_self" on public.visit_attendees
  for delete using (auth.uid() = user_id);

-- Reviews policies
drop policy if exists "reviews_select_authenticated" on public.reviews;
create policy "reviews_select_authenticated" on public.reviews
  for select using (auth.role() = 'authenticated');

drop policy if exists "reviews_insert_self" on public.reviews;
create policy "reviews_insert_self" on public.reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists "reviews_update_self" on public.reviews;
create policy "reviews_update_self" on public.reviews
  for update using (auth.uid() = user_id);

drop policy if exists "reviews_delete_self" on public.reviews;
create policy "reviews_delete_self" on public.reviews
  for delete using (auth.uid() = user_id);

-- Photos policies
drop policy if exists "photos_select_authenticated" on public.photos;
create policy "photos_select_authenticated" on public.photos
  for select using (auth.role() = 'authenticated');

drop policy if exists "photos_insert_self" on public.photos;
create policy "photos_insert_self" on public.photos
  for insert with check (auth.uid() = uploaded_by);

drop policy if exists "photos_update_self" on public.photos;
create policy "photos_update_self" on public.photos
  for update using (auth.uid() = uploaded_by);

drop policy if exists "photos_delete_self" on public.photos;
create policy "photos_delete_self" on public.photos
  for delete using (auth.uid() = uploaded_by);

-- Upcoming visits policies
drop policy if exists "upcoming_visits_select_authenticated" on public.upcoming_visits;
create policy "upcoming_visits_select_authenticated" on public.upcoming_visits
  for select using (auth.role() = 'authenticated');

drop policy if exists "upcoming_visits_insert_owner" on public.upcoming_visits;
create policy "upcoming_visits_insert_owner" on public.upcoming_visits
  for insert with check (auth.uid() = created_by);

drop policy if exists "upcoming_visits_update_owner" on public.upcoming_visits;
create policy "upcoming_visits_update_owner" on public.upcoming_visits
  for update using (auth.uid() = created_by);

drop policy if exists "upcoming_visits_delete_owner" on public.upcoming_visits;
create policy "upcoming_visits_delete_owner" on public.upcoming_visits
  for delete using (auth.uid() = created_by);

-- RSVPs policies
drop policy if exists "rsvps_select_authenticated" on public.rsvps;
create policy "rsvps_select_authenticated" on public.rsvps
  for select using (auth.role() = 'authenticated');

drop policy if exists "rsvps_insert_self" on public.rsvps;
create policy "rsvps_insert_self" on public.rsvps
  for insert with check (auth.uid() = user_id);

drop policy if exists "rsvps_update_self" on public.rsvps;
create policy "rsvps_update_self" on public.rsvps
  for update using (auth.uid() = user_id);

drop policy if exists "rsvps_delete_self" on public.rsvps;
create policy "rsvps_delete_self" on public.rsvps
  for delete using (auth.uid() = user_id);

-- Poll suggestions policies
drop policy if exists "poll_suggestions_select_authenticated" on public.poll_suggestions;
create policy "poll_suggestions_select_authenticated" on public.poll_suggestions
  for select using (auth.role() = 'authenticated');

drop policy if exists "poll_suggestions_insert_self" on public.poll_suggestions;
create policy "poll_suggestions_insert_self" on public.poll_suggestions
  for insert with check (auth.uid() = suggested_by);

drop policy if exists "poll_suggestions_update_self" on public.poll_suggestions;
create policy "poll_suggestions_update_self" on public.poll_suggestions
  for update using (auth.uid() = suggested_by);

drop policy if exists "poll_suggestions_delete_self" on public.poll_suggestions;
create policy "poll_suggestions_delete_self" on public.poll_suggestions
  for delete using (auth.uid() = suggested_by);

-- Poll votes policies
drop policy if exists "poll_votes_select_authenticated" on public.poll_votes;
create policy "poll_votes_select_authenticated" on public.poll_votes
  for select using (auth.role() = 'authenticated');

drop policy if exists "poll_votes_insert_self" on public.poll_votes;
create policy "poll_votes_insert_self" on public.poll_votes
  for insert with check (auth.uid() = user_id);

drop policy if exists "poll_votes_update_self" on public.poll_votes;
create policy "poll_votes_update_self" on public.poll_votes
  for update using (auth.uid() = user_id);

drop policy if exists "poll_votes_delete_self" on public.poll_votes;
create policy "poll_votes_delete_self" on public.poll_votes
  for delete using (auth.uid() = user_id);

-- Function to handle new user profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
