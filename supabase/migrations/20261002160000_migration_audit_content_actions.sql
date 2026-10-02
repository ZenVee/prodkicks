-- Audit every content write, new staff account, and sign-in / sign-out.
-- Clients cannot insert into staff_audit_log; these functions run as security definer.

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

revoke all on function public.log_content_change() from public, anon, authenticated;

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

revoke all on function public.record_staff_session(text) from public, anon, authenticated;
grant execute on function public.record_staff_session(text) to authenticated;
