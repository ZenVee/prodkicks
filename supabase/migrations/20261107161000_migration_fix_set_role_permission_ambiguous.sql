-- Fix ambiguous permission_key by renaming RPC args (p_*).

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

revoke all on function public.set_role_permission(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.set_role_permission(uuid, text, boolean) to authenticated;
