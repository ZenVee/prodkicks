-- Catalog tables, RLS, and seed data for public + portal content.

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
  if auth.uid() is null then
    return new;
  end if;
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
  if auth.uid() is null then
    return new;
  end if;
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
  using (
    (auth.uid() is null and archived = false)
    or (auth.uid() is not null and (archived = false or public.has_permission('collections.view')))
  );

create policy products_public_select on public.products
  for select to anon, authenticated
  using (
    (auth.uid() is null and status = 'published')
    or (auth.uid() is not null and (status = 'published' or public.has_permission('products.view')))
  );

create policy drops_public_select on public.drops
  for select to anon, authenticated
  using (true);

create policy team_members_public_select on public.team_members
  for select to anon, authenticated
  using (
    (auth.uid() is null and show_on_website = true)
    or (auth.uid() is not null and (show_on_website = true or public.has_permission('team.view')))
  );

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

-- Seed collections
insert into public.collections (id, name, slug, description, campaign_image, campaign_headline, campaign_subtitle, display_order, product_ids, archived, created_at) values ('c1', 'After Hours', 'after-hours', 'The night is the canvas. After Hours is a study in shadow and form — pieces designed for the hours when the city goes quiet and the streets belong to you. Tonal blacks, acid accents, and campaign-grade photography define this inaugural drop.', 'https://images.pexels.com/photos/13873170/pexels-photo-13873170.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'AFTER', 'HOURS.', 1, ARRAY['p1', 'p5', 'p9', 'p10'], false, '2026-08-01T10:00:00Z');
insert into public.collections (id, name, slug, description, campaign_image, campaign_headline, campaign_subtitle, display_order, product_ids, archived, created_at) values ('c2', 'No Signal', 'no-signal', 'Disconnected by design. No Signal explores the space between transmission and silence. Technical fabrics, disrupted graphics, and a cold palette define this forward-looking collection.', 'https://images.pexels.com/photos/18462142/pexels-photo-18462142.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'NO', 'SIGNAL.', 2, ARRAY['p6', 'p7', 'p8', 'p11'], false, '2026-09-01T10:00:00Z');
insert into public.collections (id, name, slug, description, campaign_image, campaign_headline, campaign_subtitle, display_order, product_ids, archived, created_at) values ('c3', 'Essentials', 'essentials', 'The foundation of the wardrobe. Essentials strips away the noise and focuses on fit, fabric, and function. Heavyweight cottons, utility-driven silhouettes, and a muted palette built for daily wear.', 'https://images.pexels.com/photos/28701960/pexels-photo-28701960.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'THE', 'ESSENTIALS.', 3, ARRAY['p2', 'p3', 'p4', 'p12'], false, '2026-06-01T10:00:00Z');
insert into public.collections (id, name, slug, description, campaign_image, campaign_headline, campaign_subtitle, display_order, product_ids, archived, created_at) values ('c4', 'Summer 26', 'summer-26', 'Lightweight layers for the warmer months. Summer 26 brings breathable fabrics, open weaves, and a brighter palette while keeping the Prod Kicks DNA intact.', 'https://images.pexels.com/photos/15127546/pexels-photo-15127546.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'SUMMER', 'TWENTY-SIX.', 4, ARRAY['p2', 'p5', 'p8'], true, '2026-04-01T10:00:00Z');

-- Seed products
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p1', 'Prod Runner 02', 'prod-runner-02', 'PK-FW-002', 'footwear', 1250, '$', 'Acid / Black', 'The Prod Runner 02 returns with a reengineered midsole and a refined acid-lime upper. Built for the city after dark — lightweight, responsive, and unapologetically bold.', 'published', 'available', ARRAY['new', 'featured'], 'c1', '[{"id":"v1","label":"07","inStock":true},{"id":"v2","label":"08","inStock":true},{"id":"v3","label":"09","inStock":true},{"id":"v4","label":"10","inStock":true},{"id":"v5","label":"11","inStock":false},{"id":"v6","label":"12","inStock":true}]'::jsonb, ARRAY['https://images.pexels.com/photos/8551784/pexels-photo-8551784.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/12745055/pexels-photo-12745055.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/8551786/pexels-photo-8551786.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-08-15T10:00:00Z', '2026-09-20T14:30:00Z');
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p2', 'Essential Heavyweight Hoodie', 'essential-heavyweight-hoodie', 'PK-AP-008', 'tops', 480, '$', 'Bone / Charcoal', 'A 500gsm heavyweight fleece hoodie with a boxy, oversized fit. Dropped shoulders, double-lined hood, and a subtle embossed PK monogram on the chest.', 'published', 'available', ARRAY['new'], 'c3', '[{"id":"v1","label":"S","inStock":true},{"id":"v2","label":"M","inStock":true},{"id":"v3","label":"L","inStock":true},{"id":"v4","label":"XL","inStock":true}]'::jsonb, ARRAY['https://images.pexels.com/photos/28701960/pexels-photo-28701960.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/14241847/pexels-photo-14241847.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/15127546/pexels-photo-15127546.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-08-20T10:00:00Z', '2026-09-18T09:15:00Z');
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p3', 'Utility Cargo', 'utility-cargo', 'PK-BT-014', 'bottoms', 620, '$', 'Olive / Black', 'Heavy-duty utility cargo pants with seven pockets, reinforced knee panels, and an adjustable hem. Designed for movement and built to last.', 'published', 'limited', ARRAY['limited'], 'c3', '[{"id":"v1","label":"30","inStock":true},{"id":"v2","label":"32","inStock":true},{"id":"v3","label":"34","inStock":false},{"id":"v4","label":"36","inStock":true}]'::jsonb, ARRAY['https://images.pexels.com/photos/35043249/pexels-photo-35043249.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/11716436/pexels-photo-11716436.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/18393526/pexels-photo-18393526.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-07-10T10:00:00Z', '2026-09-15T11:00:00Z');
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p4', 'Signature Cap', 'signature-cap', 'PK-AC-021', 'accessories', 180, '$', 'Black / Lime', 'Six-panel structured cap with a curved brim and embroidered PK logo. Adjustable strap with a metal buckle. One size fits all.', 'published', 'available', '{}', 'c3', '[{"id":"v1","label":"OS","inStock":true}]'::jsonb, ARRAY['https://images.pexels.com/photos/38622783/pexels-photo-38622783.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/6403145/pexels-photo-6403145.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-06-05T10:00:00Z', '2026-09-01T08:00:00Z');
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p5', 'Distressed Tee', 'distressed-tee', 'PK-TP-031', 'tops', 220, '$', 'Washed Black', 'Garment-dyed and distressed cotton tee with a raw hem and oversized fit. Each piece is individually treated, making every shirt unique.', 'published', 'available', ARRAY['new'], 'c1', '[{"id":"v1","label":"S","inStock":true},{"id":"v2","label":"M","inStock":true},{"id":"v3","label":"L","inStock":true},{"id":"v4","label":"XL","inStock":false}]'::jsonb, ARRAY['https://images.pexels.com/photos/15258903/pexels-photo-15258903.png?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/15258905/pexels-photo-15258905.png?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-08-25T10:00:00Z', '2026-09-22T16:00:00Z');
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p6', 'Trail Runner', 'trail-runner', 'PK-FW-005', 'footwear', 980, '$', 'Slate / Acid', 'An all-terrain runner with a lugged outsole, breathable mesh upper, and a lime-accented heel cage. Built for the trail, styled for the street.', 'published', 'coming-soon', ARRAY['featured'], 'c2', '[{"id":"v1","label":"08","inStock":false},{"id":"v2","label":"09","inStock":false},{"id":"v3","label":"10","inStock":false},{"id":"v4","label":"11","inStock":false},{"id":"v5","label":"12","inStock":false}]'::jsonb, ARRAY['https://images.pexels.com/photos/18462142/pexels-photo-18462142.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/10924127/pexels-photo-10924127.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-09-01T10:00:00Z', '2026-09-25T10:00:00Z');
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p7', 'Tech Pant', 'tech-pant', 'PK-BT-019', 'bottoms', 540, '$', 'Carbon', 'Technical nylon pants with a tapered silhouette, zip vents at the thigh, and a hidden pocket system. Water-repellent and lightweight.', 'published', 'available', '{}', 'c2', '[{"id":"v1","label":"30","inStock":true},{"id":"v2","label":"32","inStock":true},{"id":"v3","label":"34","inStock":true}]'::jsonb, ARRAY['https://images.pexels.com/photos/30415877/pexels-photo-30415877.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/14437344/pexels-photo-14437344.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-07-20T10:00:00Z', '2026-09-10T12:00:00Z');
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p8', 'Crossbody Bag', 'crossbody-bag', 'PK-AC-025', 'accessories', 320, '$', 'Black', 'A compact crossbody bag in water-resistant ripstop. Features a main compartment, front zip pocket, and an adjustable webbing strap with lime detailing.', 'published', 'available', ARRAY['new'], 'c2', '[{"id":"v1","label":"OS","inStock":true}]'::jsonb, ARRAY['https://images.pexels.com/photos/36209790/pexels-photo-36209790.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/10106033/pexels-photo-10106033.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-08-28T10:00:00Z', '2026-09-24T15:00:00Z');
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p9', 'Prod Runner 01', 'prod-runner-01', 'PK-FW-001', 'footwear', 1100, '$', 'Triple Black', 'The original Prod Runner. A minimalist silhouette in tonal black with a sculpted midsole. The shoe that started it all.', 'published', 'sold-out', ARRAY['featured'], 'c1', '[{"id":"v1","label":"07","inStock":false},{"id":"v2","label":"08","inStock":false},{"id":"v3","label":"09","inStock":false},{"id":"v4","label":"10","inStock":false}]'::jsonb, ARRAY['https://images.pexels.com/photos/13873170/pexels-photo-13873170.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/6003052/pexels-photo-6003052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-05-01T10:00:00Z', '2026-08-30T10:00:00Z');
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p10', 'After Hours Hoodie', 'after-hours-hoodie', 'PK-AP-012', 'tops', 520, '$', 'Nocturnal', 'A premium fleece hoodie from the After Hours collection. Features a tonal screen-print across the back and a relaxed, draped fit.', 'published', 'limited', ARRAY['limited', 'featured'], 'c1', '[{"id":"v1","label":"S","inStock":true},{"id":"v2","label":"M","inStock":false},{"id":"v3","label":"L","inStock":true},{"id":"v4","label":"XL","inStock":false}]'::jsonb, ARRAY['https://images.pexels.com/photos/29652516/pexels-photo-29652516.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/19461567/pexels-photo-19461567.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-08-10T10:00:00Z', '2026-09-19T13:00:00Z');
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p11', 'No Signal Tee', 'no-signal-tee', 'PK-TP-035', 'tops', 195, '$', 'Static White', 'A graphic tee from the No Signal collection featuring a disrupted signal print on heavyweight cotton. Boxy fit with a ribbed collar.', 'draft', 'coming-soon', ARRAY['new'], 'c2', '[{"id":"v1","label":"S","inStock":false},{"id":"v2","label":"M","inStock":false},{"id":"v3","label":"L","inStock":false}]'::jsonb, ARRAY['https://images.pexels.com/photos/1868566/pexels-photo-1868566.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/2315313/pexels-photo-2315313.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-09-26T10:00:00Z', '2026-09-26T10:00:00Z');
insert into public.products (id, name, slug, sku, category, price, currency, color, description, status, availability, labels, collection_id, variants, images, created_at, updated_at) values ('p12', 'Field Cap', 'field-cap', 'PK-AC-022', 'accessories', 160, '$', 'Field Tan', 'A low-profile, unstructured cap in washed cotton canvas. Tonal PK embroidery and a leather back strap. Effortless, everyday wear.', 'published', 'available', '{}', 'c3', '[{"id":"v1","label":"OS","inStock":true}]'::jsonb, ARRAY['https://images.pexels.com/photos/1606714/pexels-photo-1606714.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/15591951/pexels-photo-15591951.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], '2026-06-15T10:00:00Z', '2026-09-05T09:00:00Z');

-- Seed drops
insert into public.drops (id, name, drop_number, collection_id, release_date, release_time, campaign_headline, campaign_subtitle, campaign_description, hero_image, hero_label, show_countdown, featured_on_homepage, status, season) values ('d1', 'After Hours', 26, 'c1', '2026-09-15', '8:00 PM', 'AFTER', 'HOURS.', 'The night is the canvas. After Hours is our fall/winter campaign — a study in shadow, form, and the hours when the city goes quiet.', 'https://images.pexels.com/photos/13873170/pexels-photo-13873170.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'DROP 026', false, true, 'active', 'FALL / WINTER 26');
insert into public.drops (id, name, drop_number, collection_id, release_date, release_time, campaign_headline, campaign_subtitle, campaign_description, hero_image, hero_label, show_countdown, featured_on_homepage, status, season) values ('d2', 'No Signal', 27, 'c2', '2026-09-27', '8:00 PM', 'NO', 'SIGNAL.', 'Disconnected by design. The next chapter from Prod Kicks explores the space between transmission and silence. Coming this fall.', 'https://images.pexels.com/photos/18462142/pexels-photo-18462142.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'DROP 027', true, true, 'upcoming', 'FALL / WINTER 26');

-- Seed team members
insert into public.team_members (id, name, position, role, bio, photo, show_on_website, display_order) values ('s1', 'Marcus Cole', 'Founder & Creative Director', 'owner', 'Marcus founded Prod Kicks in 2026 with a vision to merge sneaker culture with editorial fashion. He oversees every campaign from concept to release.', 'https://images.pexels.com/photos/21939625/pexels-photo-21939625.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', true, 1);
insert into public.team_members (id, name, position, role, bio, photo, show_on_website, display_order) values ('s2', 'Elena Vasquez', 'Co-Founder & Head of Design', 'owner', 'Elena leads the design team, bringing a background in technical apparel and a sharp eye for silhouette. Every Prod Kicks piece passes through her hands.', 'https://images.pexels.com/photos/30283474/pexels-photo-30283474.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', true, 2);
insert into public.team_members (id, name, position, role, bio, photo, show_on_website, display_order) values ('s3', 'Derek Osei', 'Head of Product', 'management', 'Derek manages the product pipeline from sourcing to release. He keeps the calendar tight and the quality uncompromising.', 'https://images.pexels.com/photos/16762656/pexels-photo-16762656.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', true, 3);
insert into public.team_members (id, name, position, role, bio, photo, show_on_website, display_order) values ('s4', 'Yuki Tanaka', 'Brand Manager', 'management', 'Yuki shapes the Prod Kicks voice across every channel. From campaign copy to social, she makes sure the brand speaks with one consistent voice.', 'https://images.pexels.com/photos/32321525/pexels-photo-32321525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', true, 4);
insert into public.team_members (id, name, position, role, bio, photo, show_on_website, display_order) values ('s5', 'Jordan Blake', 'Lead Photographer', 'staff', 'Jordan shoots every Prod Kicks campaign. His work defines the visual language of the brand — dark, sharp, and cinematic.', 'https://images.pexels.com/photos/27398016/pexels-photo-27398016.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', true, 5);
insert into public.team_members (id, name, position, role, bio, photo, show_on_website, display_order) values ('s6', 'Amara Diallo', 'Community Manager', 'staff', 'Amara runs the Prod Kicks community. She is the voice behind the Discord, the face at events, and the bridge between the brand and the people.', 'https://images.pexels.com/photos/1719466/pexels-photo-1719466.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', true, 6);
insert into public.team_members (id, name, position, role, bio, photo, show_on_website, display_order) values ('s7', 'Leo Marchetti', 'Retail Associate', 'staff', 'Leo is the first face you see at the Prod Kicks flagship. He knows every product by name and every release by heart.', 'https://images.pexels.com/photos/7408085/pexels-photo-7408085.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', true, 7);
insert into public.team_members (id, name, position, role, bio, photo, show_on_website, display_order) values ('s8', 'Sofia Reyes', 'Content Creator', 'staff', 'Sofia creates the content that fills the Prod Kicks feed. From product flatlays to behind-the-scenes footage, she keeps the visual pipeline flowing.', 'https://images.pexels.com/photos/33915050/pexels-photo-33915050.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', true, 8);

insert into public.site_settings (id, company_name, tagline, established_year, currency_symbol, footer_text, seo_title, seo_description) values ('main', 'Prod Kicks', 'Footwear / Apparel / Culture', '2026', '$', 'Prod Kicks is a modern sneaker and streetwear retailer. Footwear, apparel, culture.', 'PROD KICKS — Footwear / Apparel / Culture', 'Prod Kicks is a modern sneaker and streetwear retailer. Footwear, apparel, culture.');

insert into public.homepage_content (id, sections) values ('main', '[{"id":"hs1","type":"hero","title":"Hero / Latest Drop","enabled":true,"displayOrder":1,"config":{"featuredDropId":"d1","heroImage":"https://images.pexels.com/photos/13873170/pexels-photo-13873170.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"}},{"id":"hs3","type":"shop","title":"Shop","enabled":true,"displayOrder":2,"config":{"featuredProductIds":["p1","p2","p3","p4","p5","p6","p8","p10"]}},{"id":"hs4","type":"featured-collection","title":"Featured Collection","enabled":true,"displayOrder":3,"config":{"featuredCollectionId":"c1"}},{"id":"hs5","type":"promotional-banner","title":"Promotional Banner","enabled":true,"displayOrder":4,"config":{"bannerText":"EST. 2026 — FOOTWEAR / APPAREL / CULTURE","bannerImage":"https://images.pexels.com/photos/5629659/pexels-photo-5629659.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"}}]'::jsonb);
