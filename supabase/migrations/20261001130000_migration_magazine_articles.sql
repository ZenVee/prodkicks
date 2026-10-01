-- Magazine articles table, RLS, publish gate, and magazine.* permissions.

create table public.articles (
  id text primary key,
  title text not null default '',
  slug text not null unique,
  excerpt text not null default '',
  cover_image text not null default '',
  body jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  featured_on_homepage boolean not null default false,
  author_id uuid references public.staff_accounts (id) on delete set null,
  author_name text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_status_idx on public.articles (status);
create index articles_published_at_idx on public.articles (published_at desc nulls last);
create index articles_featured_idx on public.articles (featured_on_homepage)
  where featured_on_homepage = true;

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

create or replace function public.enforce_article_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not public.has_permission('magazine.publish') then
      raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  if new.status = 'draft' and tg_op = 'UPDATE' and old.status = 'published' then
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger articles_enforce_publish
  before insert or update on public.articles
  for each row execute function public.enforce_article_publish();

alter table public.articles enable row level security;

-- Anon path must not call has_permission(); authenticated staff with magazine.view see drafts.
create policy articles_public_select on public.articles
  for select to anon, authenticated
  using (
    (auth.uid() is null and status = 'published')
    or (auth.uid() is not null and (status = 'published' or public.has_permission('magazine.view')))
  );

create policy articles_insert on public.articles
  for insert to authenticated
  with check (public.has_permission('magazine.create'));

create policy articles_update on public.articles
  for update to authenticated
  using (public.has_permission('magazine.edit'))
  with check (public.has_permission('magazine.edit'));

create policy articles_delete on public.articles
  for delete to authenticated
  using (public.has_permission('magazine.delete'));

grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;

insert into public.permissions (key, category, label, sort_order) values
  ('magazine.view', 'Magazine', 'View articles', 260),
  ('magazine.create', 'Magazine', 'Create articles', 270),
  ('magazine.edit', 'Magazine', 'Edit articles', 280),
  ('magazine.delete', 'Magazine', 'Delete articles', 290),
  ('magazine.publish', 'Magazine', 'Publish articles', 300);

-- Reposition team permissions after magazine block (optional clarity — leave existing sort orders).

insert into public.role_permissions (role, permission_key)
select 'staff', key
from public.permissions
where key in (
  'magazine.view', 'magazine.create', 'magazine.edit'
)
on conflict do nothing;

insert into public.role_permissions (role, permission_key)
select 'manager', key
from public.permissions
where key in (
  'magazine.view', 'magazine.create', 'magazine.edit', 'magazine.delete', 'magazine.publish'
)
on conflict do nothing;

insert into public.role_permissions (role, permission_key)
select 'owner', key
from public.permissions
where key like 'magazine.%'
on conflict do nothing;

-- Default hero mode for existing homepage content
update public.homepage_content
set sections = (
  select jsonb_agg(
    case
      when elem->>'type' = 'hero' then
        jsonb_set(
          elem,
          '{config,heroMode}',
          '"articles_first"'::jsonb,
          true
        )
      else elem
    end
  )
  from jsonb_array_elements(sections) as elem
)
where id = 'main';
