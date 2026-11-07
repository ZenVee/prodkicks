-- Gang / Biz product flag + optional gang/business name on sales.

alter table public.products
  add column if not exists gang_biz_item boolean not null default false;

alter table public.commission_sales
  add column if not exists gang_business_name text not null default '';

drop function if exists public.log_commission_sale(text);
drop function if exists public.log_commission_sale(text, text);
drop function if exists public.update_commission_sale(uuid, text, uuid);
drop function if exists public.update_commission_sale(uuid, text, uuid, text);

create or replace function public.log_commission_sale(
  p_product_id text,
  p_gang_business_name text default ''
)
returns public.commission_sales
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prod public.products%rowtype;
  pct numeric;
  amount numeric;
  sale public.commission_sales%rowtype;
  gang_name text := btrim(coalesce(p_gang_business_name, ''));
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_permission('sales.create') then
    raise exception 'Missing permission: sales.create';
  end if;

  select * into prod from public.products where id = p_product_id;
  if not found then
    raise exception 'Product not found';
  end if;

  if prod.gang_biz_item and gang_name = '' then
    raise exception 'Gang / Business Name is required for this product';
  end if;

  if not prod.gang_biz_item then
    gang_name := '';
  end if;

  select coalesce(ss.commission_percentage, 0)
  into pct
  from public.site_settings ss
  where ss.id = 'main';

  if pct is null then
    pct := 0;
  end if;

  amount := round(prod.price * (pct / 100.0), 2);

  insert into public.commission_sales (
    product_id,
    product_name,
    product_sku,
    gang_business_name,
    sale_price,
    commission_percentage,
    commission_amount,
    sold_by
  )
  values (
    prod.id,
    prod.name,
    coalesce(prod.sku, ''),
    gang_name,
    prod.price,
    pct,
    amount,
    uid
  )
  returning * into sale;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    uid,
    uid,
    'commission.sale_logged',
    jsonb_build_object(
      'sale_id', sale.id,
      'product_id', sale.product_id,
      'product_name', sale.product_name,
      'gang_business_name', sale.gang_business_name,
      'sale_price', sale.sale_price,
      'commission_amount', sale.commission_amount
    )
  );

  return sale;
end;
$$;

create or replace function public.update_commission_sale(
  p_sale_id uuid,
  p_product_id text,
  p_sold_by uuid,
  p_gang_business_name text default ''
)
returns public.commission_sales
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sale public.commission_sales%rowtype;
  prod public.products%rowtype;
  seller public.staff_accounts%rowtype;
  pct numeric;
  amount numeric;
  gang_name text := btrim(coalesce(p_gang_business_name, ''));
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_permission('sales.edit') then
    raise exception 'Missing permission: sales.edit';
  end if;

  select * into sale from public.commission_sales where id = p_sale_id for update;
  if not found then
    raise exception 'Sale not found';
  end if;

  if sale.payroll_run_id is not null then
    raise exception 'Paid sales cannot be edited';
  end if;

  select * into prod from public.products where id = p_product_id;
  if not found then
    raise exception 'Product not found';
  end if;

  if prod.gang_biz_item and gang_name = '' then
    raise exception 'Gang / Business Name is required for this product';
  end if;

  if not prod.gang_biz_item then
    gang_name := '';
  end if;

  select * into seller from public.staff_accounts where id = p_sold_by;
  if not found or seller.status is distinct from 'approved' then
    raise exception 'Seller must be an approved staff account';
  end if;

  select coalesce(ss.commission_percentage, 0)
  into pct
  from public.site_settings ss
  where ss.id = 'main';

  if pct is null then
    pct := 0;
  end if;

  amount := round(prod.price * (pct / 100.0), 2);

  update public.commission_sales
  set
    product_id = prod.id,
    product_name = prod.name,
    product_sku = coalesce(prod.sku, ''),
    gang_business_name = gang_name,
    sale_price = prod.price,
    commission_percentage = pct,
    commission_amount = amount,
    sold_by = seller.id
  where id = sale.id
  returning * into sale;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    uid,
    seller.id,
    'commission.sale_updated',
    jsonb_build_object(
      'sale_id', sale.id,
      'product_id', sale.product_id,
      'product_name', sale.product_name,
      'gang_business_name', sale.gang_business_name,
      'sold_by', sale.sold_by,
      'sale_price', sale.sale_price,
      'commission_amount', sale.commission_amount
    )
  );

  return sale;
end;
$$;

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
            'gang_business_name', cs.gang_business_name,
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
