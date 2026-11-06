-- Configurable product categories on site settings

alter table public.site_settings
  add column if not exists product_categories jsonb not null default '[
    {"id":"cat_footwear","slug":"footwear","label":"Footwear","icon":"footprints"},
    {"id":"cat_tops","slug":"tops","label":"Tops","icon":"shirt"},
    {"id":"cat_bottoms","slug":"bottoms","label":"Bottoms","icon":"pants"},
    {"id":"cat_accessories","slug":"accessories","label":"Accessories","icon":"watch"}
  ]'::jsonb;

update public.site_settings
set product_categories = '[
  {"id":"cat_footwear","slug":"footwear","label":"Footwear","icon":"footprints"},
  {"id":"cat_tops","slug":"tops","label":"Tops","icon":"shirt"},
  {"id":"cat_bottoms","slug":"bottoms","label":"Bottoms","icon":"pants"},
  {"id":"cat_accessories","slug":"accessories","label":"Accessories","icon":"watch"}
]'::jsonb
where id = 'main'
  and (
    product_categories is null
    or product_categories = '[]'::jsonb
  );
