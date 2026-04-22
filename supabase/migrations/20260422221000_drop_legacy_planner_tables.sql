-- Cleanup legacy planner tables replaced by Agenda v2 poll-first flow.
-- Safe because data has been verified as empty.

drop table if exists public.poll_votes;
drop table if exists public.poll_suggestions;
drop table if exists public.rsvps;
drop table if exists public.upcoming_visits;
