-- Allow anonymous visitors to read public catalog rows.
-- RLS policies must not call has_permission() for anon: anon cannot execute that function,
-- which caused entire SELECTs to fail when any non-public row was evaluated.

grant execute on function public.has_permission(text) to anon;

drop policy if exists collections_public_select on public.collections;
create policy collections_public_select on public.collections
  for select to anon, authenticated
  using (
    (auth.uid() is null and archived = false)
    or (auth.uid() is not null and (archived = false or public.has_permission('collections.view')))
  );

drop policy if exists products_public_select on public.products;
create policy products_public_select on public.products
  for select to anon, authenticated
  using (
    (auth.uid() is null and status = 'published')
    or (auth.uid() is not null and (status = 'published' or public.has_permission('products.view')))
  );

drop policy if exists team_members_public_select on public.team_members;
create policy team_members_public_select on public.team_members
  for select to anon, authenticated
  using (
    (auth.uid() is null and show_on_website = true)
    or (auth.uid() is not null and (show_on_website = true or public.has_permission('team.view')))
  );
