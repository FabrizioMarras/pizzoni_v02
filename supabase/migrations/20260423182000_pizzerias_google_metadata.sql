-- Save Google Places metadata for richer pizzeria cards and map links.

alter table public.pizzerias add column if not exists google_place_id text;
alter table public.pizzerias add column if not exists google_maps_uri text;
alter table public.pizzerias add column if not exists google_photo_name text;
alter table public.pizzerias add column if not exists latitude double precision;
alter table public.pizzerias add column if not exists longitude double precision;

create index if not exists idx_pizzerias_google_place_id on public.pizzerias (google_place_id);
