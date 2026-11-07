-- Allow products to be hidden from the storefront while remaining
-- available for portal sales tracking.

alter table public.products
  add column if not exists sales_only boolean not null default false;

drop policy if exists products_public_select on public.products;
create policy products_public_select on public.products
  for select to anon, authenticated
  using (
    (auth.uid() is null and status = 'published' and sales_only = false)
    or (
      auth.uid() is not null
      and (
        (status = 'published' and sales_only = false)
        or public.has_permission('products.view')
      )
    )
  );
