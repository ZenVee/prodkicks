-- Granular payroll permissions: view, process, reverse

insert into public.permissions (key, category, label, sort_order) values
  ('payroll.view', 'Payroll', 'View payroll logs', 838),
  ('payroll.reverse', 'Payroll', 'Reverse payroll', 845)
on conflict (key) do nothing;

update public.permissions
set sort_order = 840, label = 'Process payroll', category = 'Payroll'
where key = 'payroll.process';

-- Roles that already process payroll also get view + reverse
insert into public.role_permissions (role_id, permission_key)
select rp.role_id, p.key
from public.role_permissions rp
cross join (values ('payroll.view'), ('payroll.reverse')) as p(key)
where rp.permission_key = 'payroll.process'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select sr.id, p.key
from public.staff_roles sr
cross join (values ('payroll.view'), ('payroll.process'), ('payroll.reverse')) as p(key)
where sr.key in ('manager', 'owner')
on conflict do nothing;

create or replace function public.reverse_payroll(p_run_id uuid)
returns public.payroll_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  run public.payroll_runs%rowtype;
  sales_count integer;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_permission('payroll.reverse') then
    raise exception 'Missing permission: payroll.reverse';
  end if;

  if p_run_id is null then
    raise exception 'Payroll run id is required';
  end if;

  select * into run
  from public.payroll_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'Payroll run not found';
  end if;

  if run.reversed_at is not null then
    raise exception 'Payroll run already reversed';
  end if;

  select count(*) into sales_count
  from public.commission_sales
  where payroll_run_id = run.id;

  update public.commission_sales
  set
    payroll_run_id = null,
    paid_at = null
  where payroll_run_id = run.id;

  delete from public.payroll_bonuses
  where payroll_run_id = run.id;

  update public.payroll_runs
  set
    reversed_at = now(),
    reversed_by = uid
  where id = run.id
  returning * into run;

  insert into public.staff_audit_log (actor_user_id, action, metadata)
  values (
    uid,
    'payroll.reversed',
    jsonb_build_object(
      'payroll_run_id', run.id,
      'sales_count', sales_count,
      'grand_total', coalesce(run.snapshot->>'grand_total', '0')
    )
  );

  return run;
end;
$$;

drop policy if exists commission_sales_select on public.commission_sales;
create policy commission_sales_select
  on public.commission_sales
  for select
  to authenticated
  using (
    public.has_permission('sales.view')
    or public.has_permission('payroll.view')
    or public.has_permission('payroll.process')
    or public.has_permission('payroll.reverse')
    or sold_by = auth.uid()
  );

drop policy if exists payroll_runs_select on public.payroll_runs;
create policy payroll_runs_select
  on public.payroll_runs
  for select
  to authenticated
  using (
    public.has_permission('payroll.view')
    or public.has_permission('payroll.process')
    or public.has_permission('payroll.reverse')
  );

drop policy if exists payroll_bonuses_select on public.payroll_bonuses;
create policy payroll_bonuses_select
  on public.payroll_bonuses
  for select
  to authenticated
  using (
    public.has_permission('payroll.view')
    or public.has_permission('payroll.process')
    or public.has_permission('payroll.reverse')
  );

revoke all on function public.reverse_payroll(uuid) from public, anon, authenticated;
grant execute on function public.reverse_payroll(uuid) to authenticated;
