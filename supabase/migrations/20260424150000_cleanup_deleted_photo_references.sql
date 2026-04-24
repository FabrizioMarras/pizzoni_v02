-- Keep DB references clean when a photo is deleted.
-- If a deleted photo URL is still used as pizzeria custom cover,
-- clear that reference to avoid stale/broken image links.

create or replace function public.cleanup_deleted_photo_references()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pizzerias p
  set custom_image_url = null
  where p.custom_image_url = old.url;

  return old;
end;
$$;

drop trigger if exists photos_cleanup_deleted_references on public.photos;
create trigger photos_cleanup_deleted_references
after delete on public.photos
for each row
execute function public.cleanup_deleted_photo_references();
