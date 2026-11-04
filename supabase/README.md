# Staff Auth Setup

## Environment

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never put the service role or secret key in the frontend.

## Apply migrations

Run the SQL files in `supabase/migrations/` against your Supabase project (SQL editor or CLI), in filename order:

1. `20260929140000_migration_staff_auth.sql`
2. `20260929140100_migration_catalog_rls.sql`
3. `20260929140200_migration_public_anon_read.sql` (required if you already ran 1–2 before this fix)
4. `20260929140300_migration_drop_homepage_view.sql` (removes unused `homepage.view`)
5. `20260929140400_migration_staff_public_profile.sql` (adds `staff_accounts.position` / bio / photo fields)
6. `20261001130000_migration_magazine_articles.sql`
7. `20261002160000_migration_audit_content_actions.sql`
8. `20261104120000_migration_dynamic_staff_roles.sql` (dynamic `staff_roles` + `role_id`; drops `employee_role`)
9. `20261104130000_migration_fix_staff_roles_read.sql` (staff_roles SELECT for portal + `current_staff_role`)
10. `20261104131000_migration_staff_role_rpc_json.sql` (`current_staff_role_info` jsonb helper)

`20261104120000` is idempotent and re-asserts public-profile columns, so it can be re-run after a partial failure in the SQL editor.

For a fresh database you may run the root `database.sql` instead of replaying migrations.

## Discord OAuth (Supabase Dashboard)

1. Authentication → Providers → Discord: enable
2. Paste Discord Client ID and Client Secret
3. Authentication → URL Configuration:
   - Site URL: your app origin (e.g. `http://localhost:5173`)
   - Redirect URLs: `http://localhost:5173/auth/callback` and your production callback URL

## Discord Developer Portal

1. Create an application
2. OAuth2 → Redirects: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Copy Client ID / Secret into Supabase Discord provider settings

## First Developer bootstrap

After you sign in with Discord and complete profile setup, run in the Supabase SQL editor:

```sql
update public.staff_accounts
set
  role_id = (select id from public.staff_roles where key = 'developer'),
  status = 'approved',
  approved_at = now()
where id = 'MY-SUPABASE-USER-UUID';
```

There is no in-app way to grant Developer.
