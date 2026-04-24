-- Extend set_pizza_of_night to also sync pizzeria cover image
-- from the selected "foto della serata".

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
  v_photo_url text;
  v_pizzeria_id uuid;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(p.is_admin, false)
  into v_is_admin
  from public.profiles p
  where p.id = v_uid;

  select ph.uploaded_by, ph.url
  into v_uploaded_by, v_photo_url
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

  select v.pizzeria_id
  into v_pizzeria_id
  from public.visits v
  where v.id = p_visit_id;

  if v_pizzeria_id is not null and v_photo_url is not null then
    update public.pizzerias
    set custom_image_url = v_photo_url
    where id = v_pizzeria_id;
  end if;
end;
$$;

grant execute on function public.set_pizza_of_night(uuid, uuid) to authenticated;

