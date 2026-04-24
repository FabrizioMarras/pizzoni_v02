-- Keep "foto della serata" scoped to event photos only.
-- Do not sync pizzeria cover from event photo.

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
