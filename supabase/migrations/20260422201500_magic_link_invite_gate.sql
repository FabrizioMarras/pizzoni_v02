-- Prevent non-invited users from requesting magic links.
-- Also allows first-user bootstrap when there are no members yet.

create or replace function public.can_request_magic_link(email_input text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  member_count bigint;
  invite_exists boolean;
begin
  normalized_email := lower(trim(coalesce(email_input, '')));

  if normalized_email = '' then
    return false;
  end if;

  select exists(
    select 1
    from public.invites i
    where lower(i.email) = normalized_email
  )
  into invite_exists;

  if invite_exists then
    return true;
  end if;

  select count(*)
  into member_count
  from public.profiles p
  where p.is_member = true;

  return member_count = 0;
end;
$$;

grant execute on function public.can_request_magic_link(text) to anon, authenticated;
