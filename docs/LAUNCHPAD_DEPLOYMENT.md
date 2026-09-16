# Partner Launchpad deployment order

Migration 084 and 085 are **additive** and backward compatible with the currently deployed application. Existing partner flows continue to work when these migrations are not yet applied. Launchpad routes fail closed when required tables or RPCs are missing.

## Safe sequence

1. Apply `084_partner_launchpad_foundation.sql` to **staging** Supabase
2. Apply `085_partner_launchpad_hardening.sql` to **staging** Supabase
3. Apply `086_partner_launchpad_provision_schema_fix.sql` to **staging** Supabase (required when `partners`/`partner_policies` predate migration 039 or use the 018 policy schema)
4. Run verification SQL (below) on staging
4. Deploy PR #290 branch to **staging** Vercel
5. Complete staging smoke tests (Launchpad provision, hosted verify, activity, production approval)
6. Apply `084` then `085` to **production** Supabase while the current production app remains running
7. Run verification SQL on production
8. Merge PR #290 to `main`
9. Wait for production Vercel deployment
10. Complete production smoke tests

Do **not** merge application code before staging database objects exist if you intend to test Launchpad on staging.

## Verification SQL

```sql
-- Tables
SELECT to_regclass('public.partner_launchpad_applications');
SELECT to_regclass('public.partner_launchpad_activity');
SELECT to_regclass('public.partner_production_access_requests');

-- RPCs
SELECT proname FROM pg_proc
 WHERE proname IN (
   'partner_launchpad_provision_sandbox_atomic',
   'partner_launchpad_approve_production_atomic'
 );

-- RLS enabled
SELECT relname, relrowsecurity
  FROM pg_class
 WHERE relname IN (
   'partner_launchpad_applications',
   'partner_launchpad_activity',
   'partner_production_access_requests'
 );

-- Grants (service_role only)
SELECT grantee, privilege_type
  FROM information_schema.role_table_grants
 WHERE table_name = 'partner_launchpad_applications';
```

## Rollback SQL

```sql
DROP FUNCTION IF EXISTS public.partner_launchpad_approve_production_atomic(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.partner_launchpad_provision_sandbox_atomic(
  text, text, text, text, text, text, jsonb, text, text, text, text
);
DROP TABLE IF EXISTS public.partner_production_access_requests;
DROP TABLE IF EXISTS public.partner_launchpad_activity;
DROP TABLE IF EXISTS public.partner_launchpad_applications;
```

Only run rollback when no production Launchpad data must be retained.

## Required configuration

| Variable | Purpose | Fail closed when absent |
|---|---|---|
| `ABRAXAS_BROWSER_SESSION_SECRET` | Partner console JWT and production key envelope | Console sign in and production reveal return 503 |
| `SUPABASE_SERVICE_ROLE_KEY` | Launchpad persistence | All Launchpad APIs return 503 |

`ABRAXAS_SIGNING_KEY` is **not** used for partner console sessions. Receipt signing remains a separate domain.

## Production smoke tests

1. `/developers/launchpad` loads
2. Sandbox application provisions atomically
3. Hosted link opens `/partner/verify?app=...`
4. Activity events appear after verification
5. Hostile return URL rejected
6. Admin production approval creates production credential
7. Partner reveals production key once
