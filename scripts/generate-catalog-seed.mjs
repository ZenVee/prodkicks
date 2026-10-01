import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'supabase/_seed_data.json'), 'utf8'));

function sqlStr(v) {
  if (v === null || v === undefined) return 'null';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlJson(v) {
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
}

function sqlArr(arr) {
  if (!arr || arr.length === 0) return `'{}'`;
  return `ARRAY[${arr.map(sqlStr).join(', ')}]`;
}

const lines = [];
lines.push(`-- Catalog tables, RLS, and seed data for public + portal content.

create table public.collections (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  campaign_image text not null default '',
  campaign_headline text not null default '',
  campaign_subtitle text not null default '',
  display_order integer not null default 0,
  product_ids text[] not null default '{}',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  name text not null,
  slug text not null unique,
  sku text not null,
  category text not null,
  price numeric not null default 0,
  currency text not null default '$',
  color text not null default '',
  description text not null default '',
  status text not null default 'draft',
  availability text not null default 'available',
  labels text[] not null default '{}',
  collection_id text references public.collections (id) on delete set null,
  variants jsonb not null default '[]'::jsonb,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drops (
  id text primary key,
  name text not null,
  drop_number integer not null,
  collection_id text references public.collections (id) on delete set null,
  release_date date not null,
  release_time text not null default '',
  campaign_headline text not null default '',
  campaign_subtitle text not null default '',
  campaign_description text not null default '',
  hero_image text not null default '',
  hero_label text not null default '',
  show_countdown boolean not null default true,
  featured_on_homepage boolean not null default false,
  status text not null default 'upcoming',
  season text not null default ''
);

create table public.team_members (
  id text primary key,
  name text not null,
  position text not null default '',
  role text not null default 'staff',
  bio text not null default '',
  photo text not null default '',
  show_on_website boolean not null default true,
  display_order integer not null default 0
);

create table public.homepage_content (
  id text primary key default 'main',
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  id text primary key default 'main',
  company_name text not null default '',
  tagline text not null default '',
  established_year text not null default '',
  currency_symbol text not null default '$',
  footer_text text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  updated_at timestamptz not null default now()
);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger homepage_content_set_updated_at
  before update on public.homepage_content
  for each row execute function public.set_updated_at();

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create or replace function public.enforce_product_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not public.has_permission('products.publish') then
      raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger products_enforce_publish
  before insert or update on public.products
  for each row execute function public.enforce_product_publish();

create or replace function public.enforce_drop_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    if not public.has_permission('drops.publish') then
      raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger drops_enforce_publish
  before insert or update on public.drops
  for each row execute function public.enforce_drop_publish();

alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.drops enable row level security;
alter table public.team_members enable row level security;
alter table public.homepage_content enable row level security;
alter table public.site_settings enable row level security;

create policy collections_public_select on public.collections
  for select to anon, authenticated
  using (archived = false or public.has_permission('collections.view'));

create policy products_public_select on public.products
  for select to anon, authenticated
  using (status = 'published' or public.has_permission('products.view'));

create policy drops_public_select on public.drops
  for select to anon, authenticated
  using (true);

create policy team_members_public_select on public.team_members
  for select to anon, authenticated
  using (show_on_website = true or public.has_permission('team.view'));

create policy homepage_content_public_select on public.homepage_content
  for select to anon, authenticated
  using (true);

create policy site_settings_public_select on public.site_settings
  for select to anon, authenticated
  using (true);

create policy collections_insert on public.collections
  for insert to authenticated
  with check (public.has_permission('collections.create'));

create policy collections_update on public.collections
  for update to authenticated
  using (public.has_permission('collections.edit'))
  with check (public.has_permission('collections.edit'));

create policy collections_delete on public.collections
  for delete to authenticated
  using (public.has_permission('collections.delete'));

create policy products_insert on public.products
  for insert to authenticated
  with check (public.has_permission('products.create'));

create policy products_update on public.products
  for update to authenticated
  using (public.has_permission('products.edit'))
  with check (public.has_permission('products.edit'));

create policy products_delete on public.products
  for delete to authenticated
  using (public.has_permission('products.delete'));

create policy drops_insert on public.drops
  for insert to authenticated
  with check (public.has_permission('drops.create'));

create policy drops_update on public.drops
  for update to authenticated
  using (public.has_permission('drops.edit'))
  with check (public.has_permission('drops.edit'));

create policy drops_delete on public.drops
  for delete to authenticated
  using (public.has_permission('drops.delete'));

create policy team_members_insert on public.team_members
  for insert to authenticated
  with check (public.has_permission('team.create'));

create policy team_members_update on public.team_members
  for update to authenticated
  using (public.has_permission('team.edit'))
  with check (public.has_permission('team.edit'));

create policy team_members_delete on public.team_members
  for delete to authenticated
  using (public.has_permission('team.delete'));

create policy homepage_content_update on public.homepage_content
  for update to authenticated
  using (public.has_permission('homepage.edit'))
  with check (public.has_permission('homepage.edit'));

create policy homepage_content_insert on public.homepage_content
  for insert to authenticated
  with check (public.has_permission('homepage.edit'));

create policy site_settings_update on public.site_settings
  for update to authenticated
  using (public.has_permission('settings.edit'))
  with check (public.has_permission('settings.edit'));

create policy site_settings_insert on public.site_settings
  for insert to authenticated
  with check (public.has_permission('settings.edit'));

grant select on public.collections, public.products, public.drops, public.team_members, public.homepage_content, public.site_settings to anon, authenticated;
grant insert, update, delete on public.collections, public.products, public.drops, public.team_members to authenticated;
grant insert, update on public.homepage_content, public.site_settings to authenticated;
`);

lines.push('-- Seed collections');
for (const c of data.collections) {
  lines.push(
    `insert into public.collections (id, name, slug, description, campaign_image, campaign_headline, campaign_subtitle, display_order, product_ids, archived, created_at) values (${sqlStr(c.id)}, ${sqlStr(c.name)}, ${sqlStr(c.slug)}, ${sqlStr(c.description)}, ${sqlStr(c.campaignImage)}, ${sqlStr(c.campaignHeadline)}, ${sqlStr(c.campaignSubtitle)}, ${c.displayOrder}, ${sqlArr(c.productIds)}, ${c.archived}, ${sqlStr(c.createdAt)});`
  );
}

lines.push('');
lines.push('-- Seed products');
for (const p of data.products) {
  lines.push(
    `insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values (${sqlStr(p.id)}, ${sqlStr(p.name)}, ${sqlStr(p.slug)}, ${sqlStr(p.sku)}, ${sqlStr(p.category)}, ${p.price}, ${sqlStr(p.currency)}, ${sqlStr(p.color)}, ${sqlStr(p.description)}, ${sqlStr(p.status)}, ${sqlStr(p.availability)}, ${sqlArr(p.labels)}, ${sqlStr(p.collectionId)}, ${sqlJson(p.variants)}, ${sqlArr(p.images)}, ${sqlStr(p.createdAt)}, ${sqlStr(p.updatedAt)});`
  );
}

lines.push('');
lines.push('-- Seed drops');
for (const d of data.drops) {
  lines.push(
    `insert into public.drops (id, name, drop_number, collection_id, release_date, release_time, campaign_headline, campaign_subtitle, campaign_description, hero_image, hero_label, show_countdown, featured_on_homepage, status, season) values (${sqlStr(d.id)}, ${sqlStr(d.name)}, ${d.dropNumber}, ${sqlStr(d.collectionId)}, ${sqlStr(d.releaseDate)}, ${sqlStr(d.releaseTime)}, ${sqlStr(d.campaignHeadline)}, ${sqlStr(d.campaignSubtitle)}, ${sqlStr(d.campaignDescription)}, ${sqlStr(d.heroImage)}, ${sqlStr(d.heroLabel)}, ${d.showCountdown}, ${d.featuredOnHomepage}, ${sqlStr(d.status)}, ${sqlStr(d.season)});`
  );
}

lines.push('');
lines.push('-- Seed team members');
for (const s of data.staff) {
  lines.push(
    `insert into public.team_members (id, name, position, role, bio, photo, show_on_website, display_order) values (${sqlStr(s.id)}, ${sqlStr(s.name)}, ${sqlStr(s.position)}, ${sqlStr(s.role)}, ${sqlStr(s.bio)}, ${sqlStr(s.photo)}, ${s.showOnWebsite}, ${s.displayOrder});`
  );
}

const st = data.settings;
lines.push('');
lines.push(
  `insert into public.site_settings (id, company_name, tagline, established_year, currency_symbol, footer_text, seo_title, seo_description) values ('main', ${sqlStr(st.companyName)}, ${sqlStr(st.tagline)}, ${sqlStr(st.establishedYear)}, ${sqlStr(st.currencySymbol)}, ${sqlStr(st.footerText)}, ${sqlStr(st.seoTitle)}, ${sqlStr(st.seoDescription)});`
);

lines.push('');
lines.push(
  `insert into public.homepage_content (id, sections) values ('main', ${sqlJson(data.homepage.sections)});`
);

writeFileSync(
  join(root, 'supabase/migrations/20260929140100_migration_catalog_rls.sql'),
  lines.join('\n') + '\n'
);

try {
  unlinkSync(join(root, 'supabase/_seed_data.json'));
} catch {
  /* ignore */
}
try {
  unlinkSync(join(root, 'scripts/_tmp_export.ts'));
} catch {
  /* ignore */
}

console.log('generated catalog migration');
