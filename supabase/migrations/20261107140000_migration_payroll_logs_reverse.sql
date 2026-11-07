-- Payroll run logs: snapshot breakdown on process, reverse support

alter table public.payroll_runs
  add column if not exists snapshot jsonb not null default '{}'::jsonb,
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_by uuid references public.staff_accounts (id);

create index if not exists payroll_runs_reversed_at_idx
  on public.payroll_runs (reversed_at)
  where reversed_at is not null;

-- ---------------------------------------------------------------------------
-- process_payroll: write employee/sales/bonus snapshot for logs
-- ---------------------------------------------------------------------------

create or replace function public.process_payroll(p_bonuses jsonb default '[]'::jsonb)
returns public.payroll_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  run public.payroll_runs%rowtype;
  bonus jsonb;
  staff_id uuid;
  bonus_amount numeric;
  bonus_note text;
  unpaid_count integer;
  run_snapshot jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_permission('payroll.process') then
    raise exception 'Missing permission: payroll.process';
  end if;

  select count(*) into unpaid_count
  from public.commission_sales
  where payroll_run_id is null;

  if unpaid_count = 0 then
    raise exception 'No unpaid sales to process';
  end if;

  if p_bonuses is null then
    p_bonuses := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_bonuses) <> 'array' then
    raise exception 'Bonuses must be a JSON array';
  end if;

  insert into public.payroll_runs (processed_by)
  values (uid)
  returning * into run;

  for bonus in select * from jsonb_array_elements(p_bonuses)
  loop
    staff_id := nullif(bonus->>'staff_account_id', '')::uuid;
    bonus_amount := nullif(bonus->>'amount', '')::numeric;
    bonus_note := coalesce(bonus->>'note', '');

    if staff_id is null or bonus_amount is null or bonus_amount <= 0 then
      continue;
    end if;

    if not exists (
      select 1
      from public.commission_sales cs
      where cs.sold_by = staff_id
        and cs.payroll_run_id is null
    ) then
      raise exception 'Bonus staff has no unpaid sales: %', staff_id;
    end if;

    insert into public.payroll_bonuses (payroll_run_id, staff_account_id, amount, note)
    values (run.id, staff_id, bonus_amount, bonus_note);
  end loop;

  update public.commission_sales
  set
    payroll_run_id = run.id,
    paid_at = run.processed_at
  where payroll_run_id is null;

  select coalesce(
    jsonb_agg(employee_row order by employee_row->>'staff_name', employee_row->>'staff_account_id'),
    '[]'::jsonb
  )
  into run_snapshot
  from (
    select jsonb_build_object(
      'staff_account_id', staff.id,
      'staff_name', coalesce(nullif(staff.full_name, ''), nullif(staff.discord_username, ''), 'Unknown staff'),
      'commission_total', round(coalesce(sales.commission_total, 0), 2),
      'bonus_amount', round(coalesce(bonuses.bonus_amount, 0), 2),
      'bonus_note', coalesce(bonuses.bonus_note, ''),
      'payout', round(coalesce(sales.commission_total, 0) + coalesce(bonuses.bonus_amount, 0), 2),
      'sales', coalesce(sales.sales_json, '[]'::jsonb)
    ) as employee_row
    from (
      select distinct sold_by as staff_account_id
      from public.commission_sales
      where payroll_run_id = run.id
      union
      select staff_account_id
      from public.payroll_bonuses
      where payroll_run_id = run.id
    ) ids
    join public.staff_accounts staff on staff.id = ids.staff_account_id
    left join lateral (
      select
        sum(cs.commission_amount) as commission_total,
        jsonb_agg(
          jsonb_build_object(
            'id', cs.id,
            'product_name', cs.product_name,
            'product_sku', cs.product_sku,
            'sale_price', cs.sale_price,
            'commission_percentage', cs.commission_percentage,
            'commission_amount', cs.commission_amount,
            'sold_at', cs.sold_at
          )
          order by cs.sold_at
        ) as sales_json
      from public.commission_sales cs
      where cs.payroll_run_id = run.id
        and cs.sold_by = staff.id
    ) sales on true
    left join lateral (
      select
        sum(pb.amount) as bonus_amount,
        string_agg(nullif(pb.note, ''), '; ' order by pb.id) as bonus_note
      from public.payroll_bonuses pb
      where pb.payroll_run_id = run.id
        and pb.staff_account_id = staff.id
    ) bonuses on true
  ) employees;

  update public.payroll_runs
  set snapshot = jsonb_build_object(
    'sales_count', unpaid_count,
    'commission_total', coalesce((
      select round(sum(commission_amount), 2)
      from public.commission_sales
      where payroll_run_id = run.id
    ), 0),
    'bonus_total', coalesce((
      select round(sum(amount), 2)
      from public.payroll_bonuses
      where payroll_run_id = run.id
    ), 0),
    'grand_total', coalesce((
      select round(sum(commission_amount), 2)
      from public.commission_sales
      where payroll_run_id = run.id
    ), 0) + coalesce((
      select round(sum(amount), 2)
      from public.payroll_bonuses
      where payroll_run_id = run.id
    ), 0),
    'employees', run_snapshot
  )
  where id = run.id
  returning * into run;

  insert into public.staff_audit_log (actor_user_id, action, metadata)
  values (
    uid,
    'payroll.processed',
    jsonb_build_object(
      'payroll_run_id', run.id,
      'sales_count', unpaid_count,
      'bonuses', p_bonuses,
      'grand_total', run.snapshot->>'grand_total'
    )
  );

  return run;
end;
$$;

-- ---------------------------------------------------------------------------
-- reverse_payroll: unpay sales, drop bonuses, keep snapshot for logs
-- ---------------------------------------------------------------------------

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

  if not public.has_permission('payroll.process') then
    raise exception 'Missing permission: payroll.process';
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

-- Backfill snapshots for existing unreversed runs that still have linked sales
update public.payroll_runs pr
set snapshot = subquery.built
from (
  select
    runs.id as run_id,
    jsonb_build_object(
      'sales_count', coalesce(sc.sales_count, 0),
      'commission_total', coalesce(sc.commission_total, 0),
      'bonus_total', coalesce(bc.bonus_total, 0),
      'grand_total', coalesce(sc.commission_total, 0) + coalesce(bc.bonus_total, 0),
      'employees', coalesce(emp.employees, '[]'::jsonb)
    ) as built
  from public.payroll_runs runs
  left join lateral (
    select
      count(*)::integer as sales_count,
      round(coalesce(sum(cs.commission_amount), 0), 2) as commission_total
    from public.commission_sales cs
    where cs.payroll_run_id = runs.id
  ) sc on true
  left join lateral (
    select round(coalesce(sum(pb.amount), 0), 2) as bonus_total
    from public.payroll_bonuses pb
    where pb.payroll_run_id = runs.id
  ) bc on true
  left join lateral (
    select coalesce(
      jsonb_agg(employee_row order by employee_row->>'staff_name', employee_row->>'staff_account_id'),
      '[]'::jsonb
    ) as employees
    from (
      select jsonb_build_object(
        'staff_account_id', staff.id,
        'staff_name', coalesce(nullif(staff.full_name, ''), nullif(staff.discord_username, ''), 'Unknown staff'),
        'commission_total', round(coalesce(sales.commission_total, 0), 2),
        'bonus_amount', round(coalesce(bonuses.bonus_amount, 0), 2),
        'bonus_note', coalesce(bonuses.bonus_note, ''),
        'payout', round(coalesce(sales.commission_total, 0) + coalesce(bonuses.bonus_amount, 0), 2),
        'sales', coalesce(sales.sales_json, '[]'::jsonb)
      ) as employee_row
      from (
        select distinct sold_by as staff_account_id
        from public.commission_sales
        where payroll_run_id = runs.id
        union
        select staff_account_id
        from public.payroll_bonuses
        where payroll_run_id = runs.id
      ) ids
      join public.staff_accounts staff on staff.id = ids.staff_account_id
      left join lateral (
        select
          sum(cs.commission_amount) as commission_total,
          jsonb_agg(
            jsonb_build_object(
              'id', cs.id,
              'product_name', cs.product_name,
              'product_sku', cs.product_sku,
              'sale_price', cs.sale_price,
              'commission_percentage', cs.commission_percentage,
              'commission_amount', cs.commission_amount,
              'sold_at', cs.sold_at
            )
            order by cs.sold_at
          ) as sales_json
        from public.commission_sales cs
        where cs.payroll_run_id = runs.id
          and cs.sold_by = staff.id
      ) sales on true
      left join lateral (
        select
          sum(pb.amount) as bonus_amount,
          string_agg(nullif(pb.note, ''), '; ' order by pb.id) as bonus_note
        from public.payroll_bonuses pb
        where pb.payroll_run_id = runs.id
          and pb.staff_account_id = staff.id
      ) bonuses on true
    ) employees
  ) emp on true
) subquery
where pr.id = subquery.run_id
  and (pr.snapshot = '{}'::jsonb or pr.snapshot is null);

revoke all on function public.process_payroll(jsonb) from public, anon, authenticated;
grant execute on function public.process_payroll(jsonb) to authenticated;

revoke all on function public.reverse_payroll(uuid) from public, anon, authenticated;
grant execute on function public.reverse_payroll(uuid) to authenticated;
