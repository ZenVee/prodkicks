-- Staff authentication, approval, roles, permissions, and audit log.
-- Authorization is enforced here. React route guards are not authorization.

create type public.account_status as enum ('pending', 'approved', 'declined', 'disabled');

create type public.employee_role as enum ('developer', 'owner', 'manager', 'staff');

create table public.staff_accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  discord_id text unique,
  discord_username text,
  discord_avatar_url text,
  full_name text,
  state_id text unique,
  status public.account_status,
  role public.employee_role,
  profile_completed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_accounts_full_name_len check (full_name is null or char_length(full_name) between 2 and 80),
  constraint staff_accounts_state_id_digits check (state_id is null or state_id ~ '^[0-9]{1,32}$'),
  constraint staff_accounts_approved_by_fk foreign key (approved_by) references public.staff_accounts (id)
);

create index staff_accounts_status_idx on public.staff_accounts (status);

create table public.permissions (
  key text primary key,
  category text not null,
  label text not null,
  sort_order integer not null default 0
);

create table public.role_permissions (
  role public.employee_role not null,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role, permission_key),
  constraint role_permissions_no_developer check (role <> 'developer')
);

create table public.staff_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  target_user_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index staff_audit_log_created_at_idx on public.staff_audit_log (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger staff_accounts_set_updated_at
  before update on public.staff_accounts
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.staff_accounts (id, discord_id, discord_username, discord_avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'provider_id', new.raw_user_meta_data->>'sub'),
    coalesce(
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name'
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
exception
  when unique_violation then
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.staff_accounts
  set
    discord_id = coalesce(new.raw_user_meta_data->>'provider_id', new.raw_user_meta_data->>'sub', discord_id),
    discord_username = coalesce(
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      discord_username
    ),
    discord_avatar_url = coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      discord_avatar_url
    )
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_updated();

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

  if acct.role = 'developer' then
    return exists (select 1 from public.permissions p where p.key = requested_permission);
  end if;

  return exists (
    select 1
    from public.role_permissions rp
    where rp.role = acct.role
      and rp.permission_key = requested_permission
  );
end;
$$;

create or replace function public.current_staff_account()
returns public.staff_accounts
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  acct public.staff_accounts;
begin
  if auth.uid() is null then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into acct from public.staff_accounts where id = auth.uid();
  if not found then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  return acct;
end;
$$;

create or replace function public.can_assign_role(
  actor_role public.employee_role,
  target_role public.employee_role,
  new_role public.employee_role
)
returns boolean
language sql
immutable
as $$
  select case
    when new_role is null or new_role = 'developer' then false
    when target_role = 'developer' then false
    when actor_role = 'developer' then new_role in ('owner', 'manager', 'staff')
    when actor_role = 'owner' then
      (target_role is null or target_role in ('manager', 'staff'))
      and new_role in ('manager', 'staff')
    when actor_role = 'manager' then
      (target_role is null or target_role = 'staff')
      and new_role = 'staff'
    else false
  end;
$$;

create or replace function public.can_manage_account(
  actor_role public.employee_role,
  target_role public.employee_role
)
returns boolean
language sql
immutable
as $$
  select case
    when target_role = 'developer' then false
    when actor_role = 'developer' then true
    when actor_role = 'owner' then target_role in ('manager', 'staff')
    when actor_role = 'manager' then target_role = 'staff'
    else false
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
    role = null
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
  assigned_role public.employee_role
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

  if actor.status is distinct from 'approved' or not public.has_permission('accounts.approve') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_accounts where id = target_user_id for update;
  if not found or target.status is distinct from 'pending' or target.role = 'developer' then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  if not coalesce(public.can_assign_role(actor.role, target.role, assigned_role), false) then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  update public.staff_accounts
  set
    role = assigned_role,
    status = 'approved',
    approved_at = now(),
    approved_by = actor.id
  where id = target_user_id
  returning * into target;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (actor.id, target_user_id, 'account_approved', jsonb_build_object('role', assigned_role));

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
  if not found or target.status is distinct from 'pending' or target.role = 'developer' then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  update public.staff_accounts
  set status = 'declined', role = null
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
begin
  actor := public.current_staff_account();

  if actor.id = target_user_id
    or actor.status is distinct from 'approved'
    or not public.has_permission('accounts.disable') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_accounts where id = target_user_id for update;
  if not found
    or target.role = 'developer'
    or target.status is distinct from 'approved'
    or not coalesce(public.can_manage_account(actor.role, target.role), false) then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  update public.staff_accounts
  set status = 'disabled'
  where id = target_user_id
  returning * into target;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (actor.id, target_user_id, 'account_disabled', jsonb_build_object('role', target.role));

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
begin
  actor := public.current_staff_account();

  if actor.id = target_user_id
    or actor.status is distinct from 'approved'
    or not public.has_permission('accounts.disable') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_accounts where id = target_user_id for update;
  if not found
    or target.role = 'developer'
    or target.status is distinct from 'disabled'
    or target.role is null
    or not coalesce(public.can_manage_account(actor.role, target.role), false) then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  update public.staff_accounts
  set status = 'approved'
  where id = target_user_id
  returning * into target;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (actor.id, target_user_id, 'account_reenabled', jsonb_build_object('role', target.role));

  return target;
end;
$$;

create or replace function public.change_staff_role(
  target_user_id uuid,
  new_role public.employee_role
)
returns public.staff_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff_accounts;
  target public.staff_accounts;
  previous_role public.employee_role;
begin
  actor := public.current_staff_account();

  if actor.id = target_user_id or actor.status is distinct from 'approved' then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  select * into target from public.staff_accounts where id = target_user_id for update;
  if not found
    or target.role = 'developer'
    or target.status not in ('approved', 'disabled')
    or not coalesce(public.can_manage_account(actor.role, target.role), false)
    or not coalesce(public.can_assign_role(actor.role, target.role, new_role), false) then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  previous_role := target.role;

  update public.staff_accounts
  set role = new_role
  where id = target_user_id
  returning * into target;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    target_user_id,
    'role_changed',
    jsonb_build_object('from', previous_role, 'to', new_role)
  );

  return target;
end;
$$;

create or replace function public.set_role_permission(
  target_role public.employee_role,
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
begin
  actor := public.current_staff_account();

  if actor.status is distinct from 'approved'
    or not public.has_permission('permissions.manage')
    or target_role is null
    or target_role = 'developer'
    or not exists (select 1 from public.permissions p where p.key = permission_key) then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  if actor.role is distinct from 'developer' then
    if permission_key = 'permissions.manage' or not public.has_permission(permission_key) then
      raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
    end if;
  end if;

  if enabled then
    insert into public.role_permissions (role, permission_key)
    values (target_role, permission_key)
    on conflict do nothing;
  else
    delete from public.role_permissions
    where role = target_role and permission_key = set_role_permission.permission_key;
  end if;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    actor.id,
    null,
    'permissions_changed',
    jsonb_build_object('role', target_role, 'permission', permission_key, 'enabled', enabled)
  );
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.handle_auth_user_updated() from public, anon, authenticated;
revoke all on function public.current_staff_account() from public, anon, authenticated;
revoke all on function public.can_assign_role(public.employee_role, public.employee_role, public.employee_role) from public, anon, authenticated;
revoke all on function public.can_manage_account(public.employee_role, public.employee_role) from public, anon, authenticated;

revoke all on function public.has_permission(text) from public, anon, authenticated;
grant execute on function public.has_permission(text) to authenticated, anon;

revoke all on function public.submit_staff_profile(text, text) from public, anon, authenticated;
grant execute on function public.submit_staff_profile(text, text) to authenticated;

revoke all on function public.approve_staff_account(uuid, public.employee_role) from public, anon, authenticated;
grant execute on function public.approve_staff_account(uuid, public.employee_role) to authenticated;

revoke all on function public.decline_staff_account(uuid) from public, anon, authenticated;
grant execute on function public.decline_staff_account(uuid) to authenticated;

revoke all on function public.disable_staff_account(uuid) from public, anon, authenticated;
grant execute on function public.disable_staff_account(uuid) to authenticated;

revoke all on function public.enable_staff_account(uuid) from public, anon, authenticated;
grant execute on function public.enable_staff_account(uuid) to authenticated;

revoke all on function public.change_staff_role(uuid, public.employee_role) from public, anon, authenticated;
grant execute on function public.change_staff_role(uuid, public.employee_role) to authenticated;

revoke all on function public.set_role_permission(public.employee_role, text, boolean) from public, anon, authenticated;
grant execute on function public.set_role_permission(public.employee_role, text, boolean) to authenticated;

alter table public.staff_accounts enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_audit_log enable row level security;

create policy staff_accounts_select_own
  on public.staff_accounts
  for select
  to authenticated
  using (id = auth.uid());

create policy staff_accounts_select_reviewers
  on public.staff_accounts
  for select
  to authenticated
  using (status is not null and public.has_permission('accounts.view'));

create policy permissions_select_staff
  on public.permissions
  for select
  to authenticated
  using (
    public.has_permission('permissions.view')
    or exists (
      select 1 from public.staff_accounts s
      where s.id = auth.uid() and s.status = 'approved'
    )
  );

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
        and s.role = role_permissions.role
    )
  );

create policy staff_audit_log_select
  on public.staff_audit_log
  for select
  to authenticated
  using (public.has_permission('audit.view'));

revoke all on public.staff_accounts from public, anon, authenticated;
grant select on public.staff_accounts to authenticated;

revoke all on public.permissions from public, anon, authenticated;
grant select on public.permissions to authenticated;

revoke all on public.role_permissions from public, anon, authenticated;
grant select on public.role_permissions to authenticated;

revoke all on public.staff_audit_log from public, anon, authenticated;
grant select on public.staff_audit_log to authenticated;

insert into public.permissions (key, category, label, sort_order) values
  ('products.view', 'Products', 'View products', 10),
  ('products.create', 'Products', 'Create products', 20),
  ('products.edit', 'Products', 'Edit products', 30),
  ('products.delete', 'Products', 'Delete products', 40),
  ('products.publish', 'Products', 'Publish products', 50),
  ('collections.view', 'Collections', 'View collections', 110),
  ('collections.create', 'Collections', 'Create collections', 120),
  ('collections.edit', 'Collections', 'Edit collections', 130),
  ('collections.delete', 'Collections', 'Delete collections', 140),
  ('drops.view', 'Drops', 'View drops', 210),
  ('drops.create', 'Drops', 'Create drops', 220),
  ('drops.edit', 'Drops', 'Edit drops', 230),
  ('drops.delete', 'Drops', 'Delete drops', 240),
  ('drops.publish', 'Drops', 'Publish drops', 250),
  ('team.view', 'Team', 'View team', 310),
  ('team.create', 'Team', 'Create team members', 320),
  ('team.edit', 'Team', 'Edit team members', 330),
  ('team.delete', 'Team', 'Delete team members', 340),
  ('homepage.edit', 'Homepage', 'Edit homepage', 410),
  ('settings.view', 'Settings', 'View settings', 510),
  ('settings.edit', 'Settings', 'Edit settings', 520),
  ('accounts.view', 'Accounts', 'View accounts', 610),
  ('accounts.approve', 'Accounts', 'Approve accounts', 620),
  ('accounts.decline', 'Accounts', 'Decline accounts', 630),
  ('accounts.disable', 'Accounts', 'Disable accounts', 640),
  ('permissions.view', 'Permissions', 'View permissions', 710),
  ('permissions.manage', 'Permissions', 'Manage permissions', 720),
  ('audit.view', 'Audit', 'View audit log', 810);

insert into public.role_permissions (role, permission_key)
select 'staff', key
from public.permissions
where key in (
  'products.view', 'products.create', 'products.edit',
  'collections.view', 'collections.create', 'collections.edit',
  'drops.view',
  'team.view'
);

insert into public.role_permissions (role, permission_key)
select 'manager', key
from public.permissions
where key in (
  'products.view', 'products.create', 'products.edit', 'products.delete', 'products.publish',
  'collections.view', 'collections.create', 'collections.edit', 'collections.delete',
  'drops.view', 'drops.create', 'drops.edit', 'drops.delete', 'drops.publish',
  'team.view', 'team.create', 'team.edit', 'team.delete',
  'homepage.edit',
  'settings.view',
  'accounts.view', 'accounts.approve', 'accounts.decline'
);

insert into public.role_permissions (role, permission_key)
select 'owner', key
from public.permissions
where key not in ('permissions.manage', 'audit.view');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'staff_accounts'
     ) then
    alter publication supabase_realtime add table public.staff_accounts;
  end if;
end $$;

-- First developer. Run this manually in the Supabase SQL editor after you
-- authenticate with Discord. Do not expose it as an RPC or a button.
--
-- update public.staff_accounts
-- set
--   role = 'developer',
--   status = 'approved',
--   approved_at = now()
-- where id = 'MY-SUPABASE-USER-UUID';
