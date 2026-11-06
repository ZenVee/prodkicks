-- Commission tracking: sales log, payroll runs/bonuses, commission % setting

-- ---------------------------------------------------------------------------
-- site_settings: commission percentage
-- ---------------------------------------------------------------------------

alter table public.site_settings
  add column if not exists commission_percentage numeric not null default 0;

alter table public.site_settings
  drop constraint if exists site_settings_commission_percentage_nonneg;

alter table public.site_settings
  add constraint site_settings_commission_percentage_nonneg
  check (commission_percentage >= 0);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  processed_by uuid not null references public.staff_accounts (id),
  processed_at timestamptz not null default now()
);

create index if not exists payroll_runs_processed_at_idx
  on public.payroll_runs (processed_at desc);

create table if not exists public.commission_sales (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.products (id) on delete set null,
  product_name text not null,
  product_sku text not null default '',
  sale_price numeric not null,
  commission_percentage numeric not null,
  commission_amount numeric not null,
  sold_by uuid not null references public.staff_accounts (id),
  sold_at timestamptz not null default now(),
  payroll_run_id uuid references public.payroll_runs (id),
  paid_at timestamptz,
  constraint commission_sales_sale_price_nonneg check (sale_price >= 0),
  constraint commission_sales_commission_percentage_nonneg check (commission_percentage >= 0),
  constraint commission_sales_commission_amount_nonneg check (commission_amount >= 0)
);

create index if not exists commission_sales_sold_at_idx
  on public.commission_sales (sold_at desc);

create index if not exists commission_sales_sold_by_idx
  on public.commission_sales (sold_by);

create index if not exists commission_sales_unpaid_idx
  on public.commission_sales (sold_by)
  where payroll_run_id is null;

create table if not exists public.payroll_bonuses (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs (id) on delete cascade,
  staff_account_id uuid not null references public.staff_accounts (id),
  amount numeric not null,
  note text not null default '',
  constraint payroll_bonuses_amount_positive check (amount > 0)
);

create index if not exists payroll_bonuses_run_idx
  on public.payroll_bonuses (payroll_run_id);

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

insert into public.permissions (key, category, label, sort_order) values
  ('sales.create', 'Sales', 'Log sales', 820),
  ('sales.view', 'Sales', 'View sales log', 830),
  ('payroll.process', 'Payroll', 'Process payroll', 840)
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select sr.id, p.key
from public.staff_roles sr
cross join (values ('sales.create'), ('sales.view')) as p(key)
where sr.key = 'staff'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select sr.id, p.key
from public.staff_roles sr
cross join (values ('sales.create'), ('sales.view'), ('payroll.process')) as p(key)
where sr.key = 'manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select sr.id, p.key
from public.staff_roles sr
cross join public.permissions p
where sr.key = 'owner'
  and p.key in ('sales.create', 'sales.view', 'payroll.process')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.log_commission_sale(p_product_id text)
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
    sale_price,
    commission_percentage,
    commission_amount,
    sold_by
  )
  values (
    prod.id,
    prod.name,
    coalesce(prod.sku, ''),
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

  insert into public.staff_audit_log (actor_user_id, action, metadata)
  values (
    uid,
    'payroll.processed',
    jsonb_build_object(
      'payroll_run_id', run.id,
      'sales_count', unpaid_count,
      'bonuses', p_bonuses
    )
  );

  return run;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.payroll_runs enable row level security;
alter table public.commission_sales enable row level security;
alter table public.payroll_bonuses enable row level security;

drop policy if exists commission_sales_select on public.commission_sales;
create policy commission_sales_select
  on public.commission_sales
  for select
  to authenticated
  using (
    public.has_permission('sales.view')
    or public.has_permission('payroll.process')
    or sold_by = auth.uid()
  );

drop policy if exists payroll_runs_select on public.payroll_runs;
create policy payroll_runs_select
  on public.payroll_runs
  for select
  to authenticated
  using (public.has_permission('payroll.process'));

drop policy if exists payroll_bonuses_select on public.payroll_bonuses;
create policy payroll_bonuses_select
  on public.payroll_bonuses
  for select
  to authenticated
  using (public.has_permission('payroll.process'));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.log_commission_sale(text) from public, anon, authenticated;
grant execute on function public.log_commission_sale(text) to authenticated;

revoke all on function public.process_payroll(jsonb) from public, anon, authenticated;
grant execute on function public.process_payroll(jsonb) to authenticated;

revoke all on public.commission_sales from public, anon, authenticated;
grant select on public.commission_sales to authenticated;

revoke all on public.payroll_runs from public, anon, authenticated;
grant select on public.payroll_runs to authenticated;

revoke all on public.payroll_bonuses from public, anon, authenticated;
grant select on public.payroll_bonuses to authenticated;
