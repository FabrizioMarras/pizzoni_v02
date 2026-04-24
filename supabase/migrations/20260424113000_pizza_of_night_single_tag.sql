-- Enforce a single "pizza della serata" tag per event and provide
-- an atomic assignment function (no direct untag action).

-- Normalize existing data: keep only one tagged photo per visit (latest created_at, then id).
with ranked as (
  select
    id,
    visit_id,
    row_number() over (partition by visit_id order by created_at desc, id desc) as rn
  from public.photos
  where is_pizza_of_night = true
)
update public.photos p
set is_pizza_of_night = false
from ranked r
where p.id = r.id
  and r.rn > 1;

create unique index if not exists idx_photos_one_pizza_of_night_per_visit
  on public.photos (visit_id)
  where is_pizza_of_night = true;

create or replace function public.set_pizza_of_night(p_visit_id uuid, p_photo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_is_admin boolean;
  v_uploaded_by uuid;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(p.is_admin, false)
  into v_is_admin
  from public.profiles p
  where p.id = v_uid;

  select ph.uploaded_by
  into v_uploaded_by
  from public.photos ph
  where ph.id = p_photo_id
    and ph.visit_id = p_visit_id;

  if v_uploaded_by is null then
    raise exception 'photo_not_found';
  end if;

  if v_uploaded_by <> v_uid and not coalesce(v_is_admin, false) then
    raise exception 'not_allowed';
  end if;

  update public.photos
  set is_pizza_of_night = (id = p_photo_id)
  where visit_id = p_visit_id;
end;
$$;

grant execute on function public.set_pizza_of_night(uuid, uuid) to authenticated;
