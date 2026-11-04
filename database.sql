-- Prodkicks: complete public schema for fresh Supabase install.
-- Synthesized from supabase/migrations (final state, not migration replay).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.account_status as enum ('pending', 'approved', 'declined', 'disabled');

-- ---------------------------------------------------------------------------
-- Tables (dependency order)
-- ---------------------------------------------------------------------------

create table public.staff_roles (
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

create table public.permissions (
  key text primary key,
  category text not null,
  label text not null,
  sort_order integer not null default 0
);

create table public.staff_accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  discord_id text unique,
  discord_username text,
  discord_avatar_url text,
  full_name text,
  state_id text unique,
  status public.account_status,
  role_id uuid references public.staff_roles (id),
  profile_completed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  position text,
  bio text not null default '',
  photo_url text,
  show_on_website boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_accounts_full_name_len check (full_name is null or char_length(full_name) between 2 and 80),
  constraint staff_accounts_state_id_digits check (state_id is null or state_id ~ '^[0-9]{1,32}$'),
  constraint staff_accounts_approved_by_fk foreign key (approved_by) references public.staff_accounts (id)
);

create index staff_accounts_status_idx on public.staff_accounts (status);

create table public.role_permissions (
  role_id uuid not null references public.staff_roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
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

create table public.collections (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  campaign_image text not null default '',
  campaign_headline text not null default '',
  campaign_subtitle text not null default '',
  display_order integer not null default 0,
  product_ids text[] not null default '{}',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  name text not null,
  slug text not null unique,
  sku text not null,
  category text not null,
  price numeric not null default 0,
  currency text not null default '$',
  color text not null default '',
  description text not null default '',
  status text not null default 'draft',
  availability text not null default 'available',
  labels text[] not null default '{}',
  collection_id text references public.collections (id) on delete set null,
  variants jsonb not null default '[]'::jsonb,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drops (
  id text primary key,
  name text not null,
  drop_number integer not null,
  collection_id text references public.collections (id) on delete set null,
  release_date date not null,
  release_time text not null default '',
  campaign_headline text not null default '',
  campaign_subtitle text not null default '',
  campaign_description text not null default '',
  hero_image text not null default '',
  hero_label text not null default '',
  show_countdown boolean not null default true,
  featured_on_homepage boolean not null default false,
  status text not null default 'upcoming',
  season text not null default ''
);

create table public.team_members (
  id text primary key,
  name text not null,
  position text not null default '',
  role text not null default 'staff',
  bio text not null default '',
  photo text not null default '',
  show_on_website boolean not null default true,
  display_order integer not null default 0
);

create table public.homepage_content (
  id text primary key default 'main',
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  id text primary key default 'main',
  company_name text not null default '',
  tagline text not null default '',
  established_year text not null default '',
  currency_symbol text not null default '$',
  footer_text text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  updated_at timestamptz not null default now()
);

create table public.articles (
  id text primary key,
  title text not null default '',
  slug text not null unique,
  excerpt text not null default '',
  cover_image text not null default '',
  body jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  featured_on_homepage boolean not null default false,
  author_id uuid references public.staff_accounts (id) on delete set null,
  author_name text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_status_idx on public.articles (status);
create index articles_published_at_idx on public.articles (published_at desc nulls last);
create index articles_featured_idx on public.articles (featured_on_homepage)
  where featured_on_homepage = true;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

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

create or replace function public.current_staff_role_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select sr.key
  from public.staff_accounts sa
  left join public.staff_roles sr on sr.id = sa.role_id
  where sa.id = auth.uid();
$$;

create or replace function public.current_staff_role()
returns public.staff_roles
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result public.staff_roles;
begin
  select sr.* into result
  from public.staff_accounts sa
  join public.staff_roles sr on sr.id = sa.role_id
  where sa.id = auth.uid();
  return result;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
  discord_username text;
begin
  discord_username := coalesce(
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name'
  );

  insert into public.staff_accounts (id, discord_id, discord_username, discord_avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'provider_id', new.raw_user_meta_data->>'sub'),
    discord_username,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then
    insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
    values (
      new.id,
      new.id,
      'account_created',
      jsonb_strip_nulls(jsonb_build_object('discord_username', discord_username))
    );
  end if;

  return new;
exception
  when unique_violation then
    return new;
end;
$$;

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

create or replace function public.record_staff_session(event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or event not in ('signed_in', 'signed_out') then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (uid, uid, event, '{}'::jsonb);
end;
$$;

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

create or replace function public.enforce_product_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not public.has_permission('products.publish') then
      raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_drop_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    if not public.has_permission('drops.publish') then
      raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_article_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not public.has_permission('magazine.publish') then
      raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  if new.status = 'draft' and tg_op = 'UPDATE' and old.status = 'published' then
    new.published_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.log_content_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
  label text;
  changed text[];
begin
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
  else
    row_data := to_jsonb(new);
  end if;

  label := coalesce(row_data->>'name', row_data->>'slug', row_data->>'company_name');

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(n.key order by n.key), '{}')
    into changed
    from jsonb_each(to_jsonb(new)) as n
    join jsonb_each(to_jsonb(old)) as o on o.key = n.key
    where n.key <> 'updated_at'
      and n.value is distinct from o.value;
  end if;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    auth.uid(),
    null,
    tg_table_name || '.' || lower(tg_op),
    jsonb_strip_nulls(jsonb_build_object(
      'id', row_data->>'id',
      'label', label,
      'changed', case when tg_op = 'UPDATE' then to_jsonb(changed) else null end
    ))
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger staff_roles_set_updated_at
  before update on public.staff_roles
  for each row execute function public.set_updated_at();

create trigger staff_accounts_set_updated_at
  before update on public.staff_accounts
  for each row execute function public.set_updated_at();

create trigger role_permissions_no_developer
  before insert or update of role_id on public.role_permissions
  for each row execute function public.enforce_role_permissions_no_developer();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_updated();

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger homepage_content_set_updated_at
  before update on public.homepage_content
  for each row execute function public.set_updated_at();

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

create trigger products_enforce_publish
  before insert or update on public.products
  for each row execute function public.enforce_product_publish();

create trigger drops_enforce_publish
  before insert or update on public.drops
  for each row execute function public.enforce_drop_publish();

create trigger articles_enforce_publish
  before insert or update on public.articles
  for each row execute function public.enforce_article_publish();

create trigger products_audit
  after insert or update or delete on public.products
  for each row execute function public.log_content_change();

create trigger collections_audit
  after insert or update or delete on public.collections
  for each row execute function public.log_content_change();

create trigger drops_audit
  after insert or update or delete on public.drops
  for each row execute function public.log_content_change();

create trigger articles_audit
  after insert or update or delete on public.articles
  for each row execute function public.log_content_change();

create trigger team_members_audit
  after insert or update or delete on public.team_members
  for each row execute function public.log_content_change();

create trigger homepage_content_audit
  after insert or update or delete on public.homepage_content
  for each row execute function public.log_content_change();

create trigger site_settings_audit
  after insert or update or delete on public.site_settings
  for each row execute function public.log_content_change();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.staff_roles enable row level security;
alter table public.staff_accounts enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_audit_log enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.drops enable row level security;
alter table public.team_members enable row level security;
alter table public.homepage_content enable row level security;
alter table public.site_settings enable row level security;
alter table public.articles enable row level security;

create policy staff_roles_select
  on public.staff_roles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.staff_accounts s
      where s.id = auth.uid() and s.status = 'approved'
    )
  );

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
        and s.role_id = role_permissions.role_id
    )
  );

create policy staff_audit_log_select
  on public.staff_audit_log
  for select
  to authenticated
  using (public.has_permission('audit.view'));

create policy collections_public_select on public.collections
  for select to anon, authenticated
  using (
    (auth.uid() is null and archived = false)
    or (auth.uid() is not null and (archived = false or public.has_permission('collections.view')))
  );

create policy products_public_select on public.products
  for select to anon, authenticated
  using (
    (auth.uid() is null and status = 'published')
    or (auth.uid() is not null and (status = 'published' or public.has_permission('products.view')))
  );

create policy drops_public_select on public.drops
  for select to anon, authenticated
  using (true);

create policy team_members_public_select on public.team_members
  for select to anon, authenticated
  using (
    (auth.uid() is null and show_on_website = true)
    or (auth.uid() is not null and (show_on_website = true or public.has_permission('team.view')))
  );

create policy homepage_content_public_select on public.homepage_content
  for select to anon, authenticated
  using (true);

create policy site_settings_public_select on public.site_settings
  for select to anon, authenticated
  using (true);

create policy collections_insert on public.collections
  for insert to authenticated
  with check (public.has_permission('collections.create'));

create policy collections_update on public.collections
  for update to authenticated
  using (public.has_permission('collections.edit'))
  with check (public.has_permission('collections.edit'));

create policy collections_delete on public.collections
  for delete to authenticated
  using (public.has_permission('collections.delete'));

create policy products_insert on public.products
  for insert to authenticated
  with check (public.has_permission('products.create'));

create policy products_update on public.products
  for update to authenticated
  using (public.has_permission('products.edit'))
  with check (public.has_permission('products.edit'));

create policy products_delete on public.products
  for delete to authenticated
  using (public.has_permission('products.delete'));

create policy drops_insert on public.drops
  for insert to authenticated
  with check (public.has_permission('drops.create'));

create policy drops_update on public.drops
  for update to authenticated
  using (public.has_permission('drops.edit'))
  with check (public.has_permission('drops.edit'));

create policy drops_delete on public.drops
  for delete to authenticated
  using (public.has_permission('drops.delete'));

create policy team_members_insert on public.team_members
  for insert to authenticated
  with check (public.has_permission('team.create'));

create policy team_members_update on public.team_members
  for update to authenticated
  using (public.has_permission('team.edit'))
  with check (public.has_permission('team.edit'));

create policy team_members_delete on public.team_members
  for delete to authenticated
  using (public.has_permission('team.delete'));

create policy homepage_content_update on public.homepage_content
  for update to authenticated
  using (public.has_permission('homepage.edit'))
  with check (public.has_permission('homepage.edit'));

create policy homepage_content_insert on public.homepage_content
  for insert to authenticated
  with check (public.has_permission('homepage.edit'));

create policy site_settings_update on public.site_settings
  for update to authenticated
  using (public.has_permission('settings.edit'))
  with check (public.has_permission('settings.edit'));

create policy site_settings_insert on public.site_settings
  for insert to authenticated
  with check (public.has_permission('settings.edit'));

create policy articles_public_select on public.articles
  for select to anon, authenticated
  using (
    (auth.uid() is null and status = 'published')
    or (auth.uid() is not null and (status = 'published' or public.has_permission('magazine.view')))
  );

create policy articles_insert on public.articles
  for insert to authenticated
  with check (public.has_permission('magazine.create'));

create policy articles_update on public.articles
  for update to authenticated
  using (public.has_permission('magazine.edit'))
  with check (public.has_permission('magazine.edit'));

create policy articles_delete on public.articles
  for delete to authenticated
  using (public.has_permission('magazine.delete'));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.handle_auth_user_updated() from public, anon, authenticated;
revoke all on function public.current_staff_account() from public, anon, authenticated;
revoke all on function public.staff_role_is_developer(uuid) from public, anon, authenticated;
revoke all on function public.enforce_role_permissions_no_developer() from public, anon, authenticated;
revoke all on function public.log_content_change() from public, anon, authenticated;

revoke all on function public.has_permission(text) from public, anon, authenticated;
grant execute on function public.has_permission(text) to authenticated, anon;

revoke all on function public.submit_staff_profile(text, text) from public, anon, authenticated;
grant execute on function public.submit_staff_profile(text, text) to authenticated;

revoke all on function public.approve_staff_account(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_staff_account(uuid, uuid) to authenticated;

revoke all on function public.decline_staff_account(uuid) from public, anon, authenticated;
grant execute on function public.decline_staff_account(uuid) to authenticated;

revoke all on function public.disable_staff_account(uuid) from public, anon, authenticated;
grant execute on function public.disable_staff_account(uuid) to authenticated;

revoke all on function public.enable_staff_account(uuid) from public, anon, authenticated;
grant execute on function public.enable_staff_account(uuid) to authenticated;

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

revoke all on function public.count_approved_staff() from public;
grant execute on function public.count_approved_staff() to authenticated;

revoke all on function public.update_staff_public_profile(uuid, text, text, text, boolean, integer) from public;
grant execute on function public.update_staff_public_profile(uuid, text, text, text, boolean, integer) to authenticated;

revoke all on function public.record_staff_session(text) from public, anon, authenticated;
grant execute on function public.record_staff_session(text) to authenticated;

revoke all on function public.current_staff_role_key() from public, anon, authenticated;
grant execute on function public.current_staff_role_key() to authenticated;

revoke all on function public.current_staff_role() from public, anon, authenticated;
grant execute on function public.current_staff_role() to authenticated;

revoke all on public.staff_roles from public, anon, authenticated;
grant select on public.staff_roles to authenticated;

revoke all on public.staff_accounts from public, anon, authenticated;
grant select on public.staff_accounts to authenticated;

revoke all on public.permissions from public, anon, authenticated;
grant select on public.permissions to authenticated;

revoke all on public.role_permissions from public, anon, authenticated;
grant select on public.role_permissions to authenticated;

revoke all on public.staff_audit_log from public, anon, authenticated;
grant select on public.staff_audit_log to authenticated;

grant select on public.collections, public.products, public.drops, public.team_members, public.homepage_content, public.site_settings to anon, authenticated;
grant insert, update, delete on public.collections, public.products, public.drops, public.team_members to authenticated;
grant insert, update on public.homepage_content, public.site_settings to authenticated;

grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;

-- ---------------------------------------------------------------------------
-- Seed data (permissions, roles, role_permissions, required defaults)
-- ---------------------------------------------------------------------------

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
  ('magazine.view', 'Magazine', 'View articles', 260),
  ('magazine.create', 'Magazine', 'Create articles', 270),
  ('magazine.edit', 'Magazine', 'Edit articles', 280),
  ('magazine.delete', 'Magazine', 'Delete articles', 290),
  ('magazine.publish', 'Magazine', 'Publish articles', 300),
  ('team.view', 'Team', 'View team', 310),
  ('team.edit', 'Team', 'Edit team members', 330),
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

insert into public.staff_roles (key, label, is_system, sort_order) values
  ('developer', 'Developer', true, 0),
  ('owner', 'Owner', false, 10),
  ('manager', 'Manager', false, 20),
  ('staff', 'Staff', false, 30);

insert into public.role_permissions (role_id, permission_key)
select sr.id, p.key
from public.staff_roles sr
cross join public.permissions p
where sr.key = 'staff'
  and p.key in (
    'products.view', 'products.create', 'products.edit',
    'collections.view', 'collections.create', 'collections.edit',
    'drops.view',
    'team.view',
    'magazine.view', 'magazine.create', 'magazine.edit'
  );

insert into public.role_permissions (role_id, permission_key)
select sr.id, p.key
from public.staff_roles sr
cross join public.permissions p
where sr.key = 'manager'
  and p.key in (
    'products.view', 'products.create', 'products.edit', 'products.delete', 'products.publish',
    'collections.view', 'collections.create', 'collections.edit', 'collections.delete',
    'drops.view', 'drops.create', 'drops.edit', 'drops.delete', 'drops.publish',
    'team.view', 'team.edit',
    'homepage.edit',
    'settings.view',
    'accounts.view', 'accounts.approve', 'accounts.decline',
    'magazine.view', 'magazine.create', 'magazine.edit', 'magazine.delete', 'magazine.publish'
  );

insert into public.role_permissions (role_id, permission_key)
select sr.id, p.key
from public.staff_roles sr
cross join public.permissions p
where sr.key = 'owner'
  and p.key not in ('permissions.manage', 'audit.view');

insert into public.site_settings (id) values ('main');
insert into public.homepage_content (id, sections) values ('main', '[]'::jsonb);

-- ---------------------------------------------------------------------------
-- Realtime (optional on Supabase)
-- ---------------------------------------------------------------------------

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

-- First developer: run manually after Discord sign-in (see supabase/README.md).
