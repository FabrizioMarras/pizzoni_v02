-- Allow half-point scores in reviews (e.g. 8.5).
-- `final_score` is a generated column that depends on these fields,
-- so we must recreate it around the type change.

alter table public.reviews
  drop column if exists final_score;

alter table public.reviews
  alter column pizza_quality type double precision using pizza_quality::double precision,
  alter column ambience type double precision using ambience::double precision,
  alter column service type double precision using service::double precision,
  alter column value type double precision using value::double precision;

alter table public.reviews
  add column final_score double precision generated always as (
    (coalesce(pizza_quality, 0) + coalesce(ambience, 0) + coalesce(service, 0) + coalesce(value, 0)) / nullif(
      (case when pizza_quality is not null then 1 else 0 end +
       case when ambience is not null then 1 else 0 end +
       case when service is not null then 1 else 0 end +
       case when value is not null then 1 else 0 end), 0
    )
  ) stored;
