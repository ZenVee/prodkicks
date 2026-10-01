-- Website team profiles live on staff_accounts (same as portal employees).
-- Public site reads safe fields only via get_public_staff().

alter table public.staff_accounts
  add column if not exists position text,
  add column if not exists bio text not null default '',
  add column if not exists photo_url text,
  add column if not exists show_on_website boolean not null default false,
  add column if not exists display_order integer not null default 0;

-- Best-effort copy from legacy team_members when names match.
do $$
begin
  if to_regclass('public.team_members') is not null then
    update public.staff_accounts sa
    set
      position = coalesce(nullif(sa.position, ''), tm.position, sa.position),
      bio = case when coalesce(sa.bio, '') = '' then coalesce(tm.bio, '') else sa.bio end,
      photo_url = coalesce(nullif(sa.photo_url, ''), nullif(tm.photo, ''), sa.photo_url),
      show_on_website = coalesce(tm.show_on_website, sa.show_on_website),
      display_order = case when sa.display_order = 0 then coalesce(tm.display_order, 0) else sa.display_order end
    from public.team_members tm
    where lower(btrim(sa.full_name)) = lower(btrim(tm.name));
  end if;
end $$;

create or replace function public.get_public_staff()
returns table (
  id uuid,
  name text,
  position text,
  role public.employee_role,
  bio text,
  photo text,
  display_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sa.id,
    coalesce(sa.full_name, sa.discord_username, 'Staff') as name,
    coalesce(sa.position, '') as position,
    sa.role,
    coalesce(sa.bio, '') as bio,
    coalesce(nullif(sa.photo_url, ''), sa.discord_avatar_url, '') as photo,
    sa.display_order
  from public.staff_accounts sa
  where sa.status = 'approved'
    and sa.show_on_website = true
    and sa.role is not null
    and sa.role <> 'developer'
  order by sa.display_order asc, sa.full_name asc nulls last;
$$;

revoke all on function public.get_public_staff() from public;
grant execute on function public.get_public_staff() to anon, authenticated;

create or replace function public.count_approved_staff()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.staff_accounts
  where status = 'approved';
$$;

revoke all on function public.count_approved_staff() from public;
grant execute on function public.count_approved_staff() to authenticated;

create or replace function public.update_staff_public_profile(
  target_user_id uuid,
  new_position text default null,
  new_bio text default null,
  new_photo_url text default null,
  new_show_on_website boolean default null,
  new_display_order integer default null
)
returns public.staff_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff_accounts;
  target public.staff_accounts;
begin
  actor := public.current_staff_account();

  if actor.status is distinct from 'approved' or not public.has_permission('team.edit') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_accounts where id = target_user_id for update;
  if not found or target.status not in ('approved', 'disabled') or target.role = 'developer' then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  update public.staff_accounts
  set
    position = case when new_position is null then position else btrim(new_position) end,
    bio = case when new_bio is null then bio else new_bio end,
    photo_url = case when new_photo_url is null then photo_url else nullif(btrim(new_photo_url), '') end,
    show_on_website = coalesce(new_show_on_website, show_on_website),
    display_order = coalesce(new_display_order, display_order)
  where id = target_user_id
  returning * into target;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    target_user_id,
    'public_profile_updated',
    jsonb_build_object(
      'show_on_website', target.show_on_website,
      'display_order', target.display_order
    )
  );

  return target;
end;
$$;

revoke all on function public.update_staff_public_profile(uuid, text, text, text, boolean, integer) from public;
grant execute on function public.update_staff_public_profile(uuid, text, text, text, boolean, integer) to authenticated;

-- team.create / team.delete no longer apply (employees come from Discord approval).
delete from public.role_permissions where permission_key in ('team.create', 'team.delete');
delete from public.permissions where key in ('team.create', 'team.delete');
