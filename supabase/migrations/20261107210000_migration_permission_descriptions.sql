-- Add brief descriptions explaining what each permission does.

alter table public.permissions
  add column if not exists description text not null default '';

update public.permissions set description = v.description
from (values
  ('products.view', 'See the product catalog in the portal.'),
  ('products.create', 'Add new products to the catalog.'),
  ('products.edit', 'Change product details, images, and pricing.'),
  ('products.delete', 'Remove products from the catalog.'),
  ('products.publish', 'Make products visible on the public site.'),
  ('collections.view', 'See collections in the portal.'),
  ('collections.create', 'Create new product collections.'),
  ('collections.edit', 'Change collection details and product membership.'),
  ('collections.delete', 'Remove collections from the catalog.'),
  ('drops.view', 'See drops in the portal.'),
  ('drops.create', 'Schedule new product drops.'),
  ('drops.edit', 'Change drop details and timing.'),
  ('drops.delete', 'Remove drops from the catalog.'),
  ('drops.publish', 'Make drops visible on the public site.'),
  ('magazine.view', 'See magazine articles in the portal.'),
  ('magazine.create', 'Write new magazine articles.'),
  ('magazine.edit', 'Change article content and metadata.'),
  ('magazine.delete', 'Remove magazine articles.'),
  ('magazine.publish', 'Publish articles to the public site.'),
  ('team.view', 'See staff team profiles.'),
  ('team.edit', 'Edit team member profiles shown on the website.'),
  ('homepage.edit', 'Edit homepage content and featured sections.'),
  ('settings.view', 'View site-wide settings.'),
  ('settings.edit', 'Change site-wide settings.'),
  ('accounts.view', 'See staff accounts and access requests.'),
  ('accounts.approve', 'Approve pending staff account requests.'),
  ('accounts.decline', 'Decline pending staff account requests.'),
  ('accounts.disable', 'Disable existing staff accounts.'),
  ('permissions.view', 'View roles and their assigned permissions.'),
  ('permissions.manage', 'Create roles and change which permissions each role has.'),
  ('audit.view', 'View the staff action audit log.'),
  ('sales.create', 'Log commission sales entries.'),
  ('sales.edit', 'Edit existing commission sales entries.'),
  ('sales.view', 'View the commission sales log.'),
  ('sales.delete', 'Delete commission sales entries.'),
  ('payroll.view', 'View payroll processing history.'),
  ('payroll.process', 'Run payroll for commission payouts.'),
  ('payroll.reverse', 'Reverse a previously processed payroll run.')
) as v(key, description)
where public.permissions.key = v.key;
