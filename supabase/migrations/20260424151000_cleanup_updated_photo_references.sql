-- Keep DB references clean when a photo URL changes (replace flow).
-- If the old URL is referenced as pizzeria custom cover,
-- update it to the new URL.

create or replace function public.cleanup_updated_photo_references()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.url is distinct from new.url then
    update public.pizzerias p
    set custom_image_url = new.url
    where p.custom_image_url = old.url;
  end if;

  return new;
end;
$$;

drop trigger if exists photos_cleanup_updated_references on public.photos;
create trigger photos_cleanup_updated_references
after update of url on public.photos
for each row
execute function public.cleanup_updated_photo_references();
