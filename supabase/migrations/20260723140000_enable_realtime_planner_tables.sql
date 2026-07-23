-- Enable Supabase Realtime (postgres_changes) for the planner tables so the
-- availability calendar can update live across connected members, plus
-- pizzerias so a newly created one shows up in the "pizzeria esistente"
-- dropdown for everyone. Idempotent: safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agenda_polls'
  ) then
    alter publication supabase_realtime add table public.agenda_polls;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agenda_poll_date_options'
  ) then
    alter publication supabase_realtime add table public.agenda_poll_date_options;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agenda_poll_date_votes'
  ) then
    alter publication supabase_realtime add table public.agenda_poll_date_votes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pizzerias'
  ) then
    alter publication supabase_realtime add table public.pizzerias;
  end if;
end
$$;
