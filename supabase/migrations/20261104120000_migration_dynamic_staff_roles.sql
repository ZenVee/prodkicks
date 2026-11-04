-- Dynamic staff roles: replace employee_role enum with staff_roles table.
-- Authorization is permission-only; developer role key bypasses all checks.

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_roles_key_format check (key ~ '^[a-z][a-z0-9_]{0,31}$'),
  constraint staff_roles_label_len check (char_length(btrim(label)) between 1 and 64)
);

drop trigger if exists staff_roles_set_updated_at on public.staff_roles;
create trigger staff_roles_set_updated_at
  before update on public.staff_roles
  for each row execute function public.set_updated_at();

insert into public.staff_roles (key, label, is_system, sort_order) values
  ('developer', 'Developer', true, 0),
  ('owner', 'Owner', false, 10),
  ('manager', 'Manager', false, 20),
  ('staff', 'Staff', false, 30)
on conflict (key) do nothing;

-- Public-profile columns (from migration_staff_public_profile). Required before get_public_staff.
-- Re-assert here so this migration is self-contained if that migration was skipped.
alter table public.staff_accounts
  add column if not exists "position" text,
  add column if not exists bio text not null default '',
  add column if not exists photo_url text,
  add column if not exists show_on_website boolean not null default false,
  add column if not exists display_order integer not null default 0;

-- Drop only signature-changed / removed functions (do NOT drop has_permission — RLS depends on it)
drop policy if exists role_permissions_select on public.role_permissions;
drop policy if exists staff_roles_select on public.staff_roles;

drop function if exists public.get_public_staff();

do $$
begin
  -- Only valid while employee_role enum still exists
  if exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
             where n.nspname = 'public' and t.typname = 'employee_role') then
    execute 'drop function if exists public.can_assign_role(public.employee_role, public.employee_role, public.employee_role)';
    execute 'drop function if exists public.can_manage_account(public.employee_role, public.employee_role)';
    execute 'drop function if exists public.approve_staff_account(uuid, public.employee_role)';
    execute 'drop function if exists public.change_staff_role(uuid, public.employee_role)';
    execute 'drop function if exists public.set_role_permission(public.employee_role, text, boolean)';
  end if;
end $$;

-- Migrate role_permissions onto role_id
alter table public.role_permissions
  add column if not exists role_id uuid references public.staff_roles (id) on delete cascade;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'role_permissions'
      and column_name = 'role'
  ) then
    update public.role_permissions rp
    set role_id = sr.id
    from public.staff_roles sr
    where rp.role_id is null and sr.key = rp.role::text;
  end if;
end $$;

alter table public.role_permissions
  alter column role_id set not null;

alter table public.role_permissions
  drop constraint if exists role_permissions_pkey;

alter table public.role_permissions
  drop constraint if exists role_permissions_no_developer;

alter table public.role_permissions
  drop column if exists role;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'role_permissions_pkey'
      and conrelid = 'public.role_permissions'::regclass
  ) then
    alter table public.role_permissions
      add primary key (role_id, permission_key);
  end if;
end $$;

create or replace function public.enforce_role_permissions_no_developer()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.staff_roles sr
    where sr.id = new.role_id and sr.key = 'developer'
  ) then
    raise exception 'Developer role cannot have role_permissions rows.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists role_permissions_no_developer on public.role_permissions;
create trigger role_permissions_no_developer
  before insert or update of role_id on public.role_permissions
  for each row execute function public.enforce_role_permissions_no_developer();

-- Migrate staff_accounts.role → role_id
alter table public.staff_accounts
  add column if not exists role_id uuid references public.staff_roles (id);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'staff_accounts'
      and column_name = 'role'
  ) then
    update public.staff_accounts sa
    set role_id = sr.id
    from public.staff_roles sr
    where sa.role_id is null and sa.role is not null and sr.key = sa.role::text;
  end if;
end $$;

-- Replace has_permission in place before dropping role (RLS policies depend on it)
create or replace function public.staff_role_is_developer(p_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_roles sr
    where sr.id = p_role_id and sr.key = 'developer'
  );
$$;

create or replace function public.has_permission(requested_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  acct public.staff_accounts%rowtype;
begin
  if auth.uid() is null or requested_permission is null then
    return false;
  end if;

  select * into acct from public.staff_accounts where id = auth.uid();
  if not found or acct.status is distinct from 'approved' then
    return false;
  end if;

  if public.staff_role_is_developer(acct.role_id) then
    return exists (select 1 from public.permissions p where p.key = requested_permission);
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

create or replace function public.submit_staff_profile(full_name text, state_id text)
returns public.staff_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  acct public.staff_accounts;
  clean_name text;
  clean_state text;
begin
  if uid is null then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into acct from public.staff_accounts where id = uid for update;
  if not found or acct.status is not null then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  clean_name := btrim(full_name);
  clean_state := btrim(state_id);

  if clean_name is null or char_length(clean_name) < 2 or char_length(clean_name) > 80 then
    raise exception 'Enter a full name between 2 and 80 characters.' using errcode = '22023';
  end if;

  if clean_state is null or clean_state !~ '^[0-9]{1,32}$' then
    raise exception 'State ID must contain digits only.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.staff_accounts s
    where s.state_id = clean_state and s.id <> uid
  ) then
    raise exception 'That State ID is already associated with another account.' using errcode = '23505';
  end if;

  update public.staff_accounts
  set
    full_name = clean_name,
    state_id = clean_state,
    profile_completed_at = now(),
    status = 'pending',
    role_id = null
  where id = uid
  returning * into acct;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (uid, uid, 'profile_submitted', jsonb_build_object('full_name', clean_name));

  return acct;
exception
  when unique_violation then
    raise exception 'That State ID is already associated with another account.' using errcode = '23505';
end;
$$;

create or replace function public.approve_staff_account(
  target_user_id uuid,
  assigned_role_id uuid
)
returns public.staff_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff_accounts;
  target public.staff_accounts;
  assigned_key text;
begin
  actor := public.current_staff_account();

  if actor.status is distinct from 'approved' or not public.has_permission('accounts.approve') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select sr.key into assigned_key from public.staff_roles sr where sr.id = assigned_role_id;
  if assigned_key is null or assigned_key = 'developer' then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_accounts where id = target_user_id for update;
  if not found
    or target.status is distinct from 'pending'
    or public.staff_role_is_developer(target.role_id) then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  update public.staff_accounts
  set
    role_id = assigned_role_id,
    status = 'approved',
    approved_at = now(),
    approved_by = actor.id
  where id = target_user_id
  returning * into target;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    target_user_id,
    'account_approved',
    jsonb_build_object('role_id', assigned_role_id, 'role_key', assigned_key)
  );

  return target;
end;
$$;

create or replace function public.decline_staff_account(target_user_id uuid)
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

  if actor.status is distinct from 'approved' or not public.has_permission('accounts.decline') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_accounts where id = target_user_id for update;
  if not found
    or target.status is distinct from 'pending'
    or public.staff_role_is_developer(target.role_id) then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  update public.staff_accounts
  set status = 'declined', role_id = null
  where id = target_user_id
  returning * into target;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (actor.id, target_user_id, 'account_declined', '{}'::jsonb);

  return target;
end;
$$;

create or replace function public.disable_staff_account(target_user_id uuid)
returns public.staff_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff_accounts;
  target public.staff_accounts;
  target_key text;
begin
  actor := public.current_staff_account();

  if actor.id = target_user_id
    or actor.status is distinct from 'approved'
    or not public.has_permission('accounts.disable') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_accounts where id = target_user_id for update;
  if not found
    or public.staff_role_is_developer(target.role_id)
    or target.status is distinct from 'approved' then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select sr.key into target_key from public.staff_roles sr where sr.id = target.role_id;

  update public.staff_accounts
  set status = 'disabled'
  where id = target_user_id
  returning * into target;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    target_user_id,
    'account_disabled',
    jsonb_build_object('role_id', target.role_id, 'role_key', target_key)
  );

  return target;
end;
$$;

create or replace function public.enable_staff_account(target_user_id uuid)
returns public.staff_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff_accounts;
  target public.staff_accounts;
  target_key text;
begin
  actor := public.current_staff_account();

  if actor.id = target_user_id
    or actor.status is distinct from 'approved'
    or not public.has_permission('accounts.disable') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_accounts where id = target_user_id for update;
  if not found
    or public.staff_role_is_developer(target.role_id)
    or target.status is distinct from 'disabled'
    or target.role_id is null then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select sr.key into target_key from public.staff_roles sr where sr.id = target.role_id;

  update public.staff_accounts
  set status = 'approved'
  where id = target_user_id
  returning * into target;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    target_user_id,
    'account_reenabled',
    jsonb_build_object('role_id', target.role_id, 'role_key', target_key)
  );

  return target;
end;
$$;

-- Same-signature RPCs above now use role_id; drop remaining role-dependent RPC then column/type
drop function if exists public.update_staff_public_profile(uuid, text, text, text, boolean, integer);

alter table public.staff_accounts drop column if exists role;

drop type if exists public.employee_role;

create or replace function public.change_staff_role(
  target_user_id uuid,
  new_role_id uuid
)
returns public.staff_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff_accounts;
  target public.staff_accounts;
  previous_role_id uuid;
  previous_key text;
  new_key text;
begin
  actor := public.current_staff_account();

  if actor.id = target_user_id
    or actor.status is distinct from 'approved'
    or not public.has_permission('accounts.approve') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select sr.key into new_key from public.staff_roles sr where sr.id = new_role_id;
  if new_key is null or new_key = 'developer' then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_accounts where id = target_user_id for update;
  if not found
    or public.staff_role_is_developer(target.role_id)
    or target.status not in ('approved', 'disabled') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  previous_role_id := target.role_id;
  select sr.key into previous_key from public.staff_roles sr where sr.id = previous_role_id;

  update public.staff_accounts
  set role_id = new_role_id
  where id = target_user_id
  returning * into target;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    target_user_id,
    'role_changed',
    jsonb_build_object(
      'from_role_id', previous_role_id,
      'from_role_key', previous_key,
      'to_role_id', new_role_id,
      'to_role_key', new_key
    )
  );

  return target;
end;
$$;

create or replace function public.set_role_permission(
  target_role_id uuid,
  permission_key text,
  enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff_accounts;
  target_key text;
begin
  actor := public.current_staff_account();

  select sr.key into target_key from public.staff_roles sr where sr.id = target_role_id;

  if actor.status is distinct from 'approved'
    or not public.has_permission('permissions.manage')
    or target_key is null
    or target_key = 'developer'
    or not exists (select 1 from public.permissions p where p.key = permission_key) then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  if not public.staff_role_is_developer(actor.role_id) then
    if permission_key = 'permissions.manage' or not public.has_permission(permission_key) then
      raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
    end if;
  end if;

  if enabled then
    insert into public.role_permissions (role_id, permission_key)
    values (target_role_id, permission_key)
    on conflict do nothing;
  else
    delete from public.role_permissions
    where role_id = target_role_id
      and permission_key = set_role_permission.permission_key;
  end if;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    null,
    'permissions_changed',
    jsonb_build_object(
      'role_id', target_role_id,
      'role', target_key,
      'permission', permission_key,
      'enabled', enabled
    )
  );
end;
$$;

create or replace function public.create_staff_role(role_key text, role_label text)
returns public.staff_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff_accounts;
  clean_key text;
  clean_label text;
  next_sort integer;
  created public.staff_roles;
begin
  actor := public.current_staff_account();

  if actor.status is distinct from 'approved' or not public.has_permission('permissions.manage') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  clean_key := lower(btrim(role_key));
  clean_label := btrim(role_label);

  if clean_key is null or clean_key !~ '^[a-z][a-z0-9_]{0,31}$' or clean_key = 'developer' then
    raise exception 'Enter a valid role key (lowercase letters, numbers, underscores).' using errcode = '22023';
  end if;

  if clean_label is null or char_length(clean_label) < 1 or char_length(clean_label) > 64 then
    raise exception 'Enter a role label between 1 and 64 characters.' using errcode = '22023';
  end if;

  select coalesce(max(sort_order), 0) + 10 into next_sort from public.staff_roles;

  insert into public.staff_roles (key, label, is_system, sort_order)
  values (clean_key, clean_label, false, next_sort)
  returning * into created;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    null,
    'role_created',
    jsonb_build_object('role_id', created.id, 'role_key', created.key, 'label', created.label)
  );

  return created;
exception
  when unique_violation then
    raise exception 'A role with that key already exists.' using errcode = '23505';
end;
$$;

create or replace function public.update_staff_role(
  target_role_id uuid,
  role_label text default null,
  role_sort_order integer default null
)
returns public.staff_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff_accounts;
  target public.staff_roles;
  clean_label text;
begin
  actor := public.current_staff_account();

  if actor.status is distinct from 'approved' or not public.has_permission('permissions.manage') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_roles where id = target_role_id for update;
  if not found or target.is_system or target.key = 'developer' then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  if role_label is not null then
    clean_label := btrim(role_label);
    if char_length(clean_label) < 1 or char_length(clean_label) > 64 then
      raise exception 'Enter a role label between 1 and 64 characters.' using errcode = '22023';
    end if;
  end if;

  update public.staff_roles
  set
    label = coalesce(clean_label, label),
    sort_order = coalesce(role_sort_order, sort_order)
  where id = target_role_id
  returning * into target;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    null,
    'role_updated',
    jsonb_build_object('role_id', target.id, 'role_key', target.key, 'label', target.label)
  );

  return target;
end;
$$;

create or replace function public.delete_staff_role(target_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff_accounts;
  target public.staff_roles;
begin
  actor := public.current_staff_account();

  if actor.status is distinct from 'approved' or not public.has_permission('permissions.manage') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_roles where id = target_role_id for update;
  if not found or target.is_system or target.key = 'developer' then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  if exists (select 1 from public.staff_accounts sa where sa.role_id = target_role_id) then
    raise exception 'Reassign accounts using this role before deleting it.' using errcode = '23503';
  end if;

  delete from public.staff_roles where id = target_role_id;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    null,
    'role_deleted',
    jsonb_build_object('role_id', target.id, 'role_key', target.key, 'label', target.label)
  );
end;
$$;

-- Re-assert profile columns immediately before functions that read them
alter table public.staff_accounts
  add column if not exists "position" text,
  add column if not exists bio text not null default '',
  add column if not exists photo_url text,
  add column if not exists show_on_website boolean not null default false,
  add column if not exists display_order integer not null default 0;

create or replace function public.get_public_staff()
returns table (
  id uuid,
  name text,
  "position" text,
  role text,
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
    coalesce(sa."position", '') as "position",
    sr.key as role,
    coalesce(sa.bio, '') as bio,
    coalesce(nullif(sa.photo_url, ''), sa.discord_avatar_url, '') as photo,
    sa.display_order
  from public.staff_accounts sa
  join public.staff_roles sr on sr.id = sa.role_id
  where sa.status = 'approved'
    and sa.show_on_website = true
    and sa.role_id is not null
    and sr.key <> 'developer'
  order by sa.display_order asc, sa.full_name asc nulls last;
$$;

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
  if not found
    or target.status not in ('approved', 'disabled')
    or public.staff_role_is_developer(target.role_id) then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  update public.staff_accounts
  set
    "position" = case when new_position is null then "position" else btrim(new_position) end,
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

-- RLS for staff_roles
alter table public.staff_roles enable row level security;

drop policy if exists staff_roles_select on public.staff_roles;
create policy staff_roles_select
  on public.staff_roles
  for select
  to authenticated
  using (
    public.has_permission('permissions.view')
    or exists (
      select 1 from public.staff_accounts s
      where s.id = auth.uid() and s.status = 'approved'
    )
  );

drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select
  on public.role_permissions
  for select
  to authenticated
  using (
    public.has_permission('permissions.view')
    or exists (
      select 1 from public.staff_accounts s
      where s.id = auth.uid()
        and s.status = 'approved'
        and s.role_id = role_permissions.role_id
    )
  );

revoke all on public.staff_roles from public, anon, authenticated;
grant select on public.staff_roles to authenticated;

revoke all on function public.staff_role_is_developer(uuid) from public, anon, authenticated;
revoke all on function public.enforce_role_permissions_no_developer() from public, anon, authenticated;

revoke all on function public.approve_staff_account(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_staff_account(uuid, uuid) to authenticated;

revoke all on function public.change_staff_role(uuid, uuid) from public, anon, authenticated;
grant execute on function public.change_staff_role(uuid, uuid) to authenticated;

revoke all on function public.set_role_permission(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.set_role_permission(uuid, text, boolean) to authenticated;

revoke all on function public.create_staff_role(text, text) from public, anon, authenticated;
grant execute on function public.create_staff_role(text, text) to authenticated;

revoke all on function public.update_staff_role(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.update_staff_role(uuid, text, integer) to authenticated;

revoke all on function public.delete_staff_role(uuid) from public, anon, authenticated;
grant execute on function public.delete_staff_role(uuid) to authenticated;

revoke all on function public.get_public_staff() from public;
grant execute on function public.get_public_staff() to anon, authenticated;

revoke all on function public.update_staff_public_profile(uuid, text, text, text, boolean, integer) from public;
grant execute on function public.update_staff_public_profile(uuid, text, text, text, boolean, integer) to authenticated;

-- Re-grant has_permission (replaced in place)
revoke all on function public.has_permission(text) from public, anon, authenticated;
grant execute on function public.has_permission(text) to authenticated, anon;

revoke all on function public.decline_staff_account(uuid) from public, anon, authenticated;
grant execute on function public.decline_staff_account(uuid) to authenticated;

revoke all on function public.disable_staff_account(uuid) from public, anon, authenticated;
grant execute on function public.disable_staff_account(uuid) to authenticated;

revoke all on function public.enable_staff_account(uuid) from public, anon, authenticated;
grant execute on function public.enable_staff_account(uuid) to authenticated;

revoke all on function public.submit_staff_profile(text, text) from public, anon, authenticated;
grant execute on function public.submit_staff_profile(text, text) to authenticated;
