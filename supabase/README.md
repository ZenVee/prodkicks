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
  role = 'developer',
  status = 'approved',
  approved_at = now()
where id = 'MY-SUPABASE-USER-UUID';
```

There is no in-app way to grant Developer.
