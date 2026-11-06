-- Edit / delete unpaid commission sales

insert into public.permissions (key, category, label, sort_order) values
  ('sales.edit', 'Sales', 'Edit sales', 825),
  ('sales.delete', 'Sales', 'Delete sales', 835)
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select sr.id, p.key
from public.staff_roles sr
cross join (values ('sales.edit'), ('sales.delete')) as p(key)
where sr.key = 'manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select sr.id, p.key
from public.staff_roles sr
cross join public.permissions p
where sr.key = 'owner'
  and p.key in ('sales.edit', 'sales.delete')
on conflict do nothing;

create or replace function public.list_sales_assignees()
returns table (
  id uuid,
  full_name text,
  discord_username text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_permission('sales.edit') then
    raise exception 'Missing permission: sales.edit';
  end if;

  return query
  select sa.id, sa.full_name, sa.discord_username
  from public.staff_accounts sa
  where sa.status = 'approved'
  order by coalesce(nullif(btrim(sa.full_name), ''), sa.discord_username, sa.id::text);
end;
$$;

create or replace function public.update_commission_sale(
  p_sale_id uuid,
  p_product_id text,
  p_sold_by uuid
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
      'sold_by', sale.sold_by,
      'sale_price', sale.sale_price,
      'commission_amount', sale.commission_amount
    )
  );

  return sale;
end;
$$;

create or replace function public.delete_commission_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sale public.commission_sales%rowtype;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_permission('sales.delete') then
    raise exception 'Missing permission: sales.delete';
  end if;

  select * into sale from public.commission_sales where id = p_sale_id for update;
  if not found then
    raise exception 'Sale not found';
  end if;

  if sale.payroll_run_id is not null then
    raise exception 'Paid sales cannot be deleted';
  end if;

  delete from public.commission_sales where id = sale.id;

  insert into public.staff_audit_log (actor_user_id, target_user_id, action, metadata)
  values (
    uid,
    sale.sold_by,
    'commission.sale_deleted',
    jsonb_build_object(
      'sale_id', sale.id,
      'product_id', sale.product_id,
      'product_name', sale.product_name,
      'sold_by', sale.sold_by,
      'sale_price', sale.sale_price,
      'commission_amount', sale.commission_amount
    )
  );
end;
$$;

revoke all on function public.list_sales_assignees() from public, anon, authenticated;
grant execute on function public.list_sales_assignees() to authenticated;

revoke all on function public.update_commission_sale(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.update_commission_sale(uuid, text, uuid) to authenticated;

revoke all on function public.delete_commission_sale(uuid) from public, anon, authenticated;
grant execute on function public.delete_commission_sale(uuid) to authenticated;
