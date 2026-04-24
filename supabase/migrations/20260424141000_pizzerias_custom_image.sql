-- Allow manual cover image on pizzerias.

alter table public.pizzerias
  add column if not exists custom_image_url text;
