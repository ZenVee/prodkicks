-- Return role as jsonb so PostgREST/JS always get a structured object.

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

revoke all on function public.current_staff_role_key() from public, anon, authenticated;
grant execute on function public.current_staff_role_key() to authenticated;

revoke all on function public.current_staff_role_info() from public, anon, authenticated;
grant execute on function public.current_staff_role_info() to authenticated;

-- Keep staff_roles readable for approved staff (nav / matrix).
alter table public.staff_roles enable row level security;

revoke all on public.staff_roles from public, anon;
grant select on public.staff_roles to authenticated;

drop policy if exists staff_roles_select on public.staff_roles;
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
