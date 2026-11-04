-- Ensure authenticated staff can read staff_roles (needed for portal roleKey / developer bypass).

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

-- Security-definer helper so the app can always resolve the caller's role key.
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

revoke all on function public.current_staff_role_key() from public, anon, authenticated;
grant execute on function public.current_staff_role_key() to authenticated;

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

revoke all on function public.current_staff_role() from public, anon, authenticated;
grant execute on function public.current_staff_role() to authenticated;
