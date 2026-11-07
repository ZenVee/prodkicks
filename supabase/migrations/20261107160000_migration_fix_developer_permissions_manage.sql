-- Developers have no role_permissions rows; has_permission must short-circuit
-- to true without querying the permissions catalog (RLS-safe).

create or replace function public.has_permission(requested_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  acct public.staff_accounts%rowtype;
  role_key text;
begin
  if auth.uid() is null or requested_permission is null then
    return false;
  end if;

  select * into acct from public.staff_accounts where id = auth.uid();
  if not found or acct.status is distinct from 'approved' then
    return false;
  end if;

  select sr.key into role_key
  from public.staff_roles sr
  where sr.id = acct.role_id;

  if role_key = 'developer' then
    return true;
  end if;

  if acct.role_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.role_permissions rp
    where rp.role_id = acct.role_id
      and rp.permission_key = requested_permission
  );
end;
$$;

drop function if exists public.set_role_permission(uuid, text, boolean);

create or replace function public.set_role_permission(
  p_target_role_id uuid,
  p_permission_key text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff_accounts;
  actor_key text;
  target_key text;
begin
  actor := public.current_staff_account();

  select sr.key into actor_key from public.staff_roles sr where sr.id = actor.role_id;
  select sr.key into target_key from public.staff_roles sr where sr.id = p_target_role_id;

  if actor.status is distinct from 'approved'
    or target_key is null
    or target_key = 'developer'
    or not exists (select 1 from public.permissions p where p.key = p_permission_key) then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  if actor_key is distinct from 'developer' then
    if not public.has_permission('permissions.manage') then
      raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
    end if;

    if p_permission_key = 'permissions.manage' or not public.has_permission(p_permission_key) then
      raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
    end if;
  end if;

  if p_enabled then
    insert into public.role_permissions (role_id, permission_key)
    values (p_target_role_id, p_permission_key)
    on conflict do nothing;
  else
    delete from public.role_permissions
    where role_id = p_target_role_id
      and role_permissions.permission_key = p_permission_key;
  end if;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    null,
    'permissions_changed',
    jsonb_build_object(
      'role_id', p_target_role_id,
      'role', target_key,
      'permission', p_permission_key,
      'enabled', p_enabled
    )
  );
end;
$$;

create or replace function public.current_staff_role_info()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when sr.id is null then null
    else jsonb_build_object(
      'id', sr.id,
      'key', sr.key,
      'label', sr.label,
      'is_system', sr.is_system
    )
  end
  from public.staff_accounts sa
  left join public.staff_roles sr on sr.id = sa.role_id
  where sa.id = auth.uid();
$$;

revoke all on function public.has_permission(text) from public, anon, authenticated;
grant execute on function public.has_permission(text) to authenticated, anon;

revoke all on function public.set_role_permission(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.set_role_permission(uuid, text, boolean) to authenticated;

revoke all on function public.current_staff_role_info() from public, anon, authenticated;
grant execute on function public.current_staff_role_info() to authenticated;
