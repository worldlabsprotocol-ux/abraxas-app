# DEMO-only webhook TEST EVENT runbook (067 + 069)

**NEVER run this on MAIN or Production.**  
**Forbidden project ref:** `bztwutzprwsdrtqdpymf` (MAIN / Production).  
**Allowed project ref only:** `ocntwbxarpjeixdnzide` (`abraxas-partner-demo`).

This runbook exists because Preview Launchpad `POST /webhooks/test` returned `enqueue_unavailable`. Read-only DEMO diagnosis found:

- `062_partner_webhook_outbox.sql` is recorded in `demo_ops.migration_ledger`
- `067_partner_webhook_test_event_atomic.sql` is **not** recorded
- `069_partner_webhook_test_advisory_lock_fix.sql` is **not** recorded
- `enqueue_partner_webhook_test_delivery(text)` **does not exist**
- outbox CHECK still matches 062 (`partner.receipt.issued|revoked`, `partner.access.revoked`, `partner.credential.revoked`) and does **not** include `partner.webhook.test`
- `service_role` already has SELECT/INSERT/UPDATE on outbox/config tables from 065; it has **no EXECUTE** on the missing RPC

Do not query or change MAIN. Do not apply this from CI against Production Vercel.

## Required apply order (DEMO only)

Already applied: `062_partner_webhook_outbox.sql`.

Apply next, in this order, from the repo files (do not paste MAIN SQL):

1. `supabase/migrations/067_partner_webhook_test_event_atomic.sql`
2. `supabase/migrations/069_partner_webhook_test_advisory_lock_fix.sql`

Optional (not required for TEST EVENT enqueue; missing on DEMO today): `063_partner_webhook_operator_ops.sql` for dispatch-run telemetry.

Record each filename in `demo_ops.migration_ledger` using the demo migrate runner after a successful apply, or insert the ledger row only after the verification queries pass.

## Operator steps

1. Confirm the SQL editor / `psql` session is connected to `db.ocntwbxarpjeixdnzide.supabase.co`.
2. Run the preflight queries below. Abort if `current_database()` or hostname is not DEMO.
3. Apply file 067, then file 069, exactly as committed.
4. Run the verification queries. Abort if any fail.
5. Do not enable Google OAuth, Production activation, or MAIN grants.

## Preflight (abort unless DEMO)

```sql
SELECT inet_server_addr() IS NOT NULL AS has_server;
-- Abort unless the dashboard project ref shown is ocntwbxarpjeixdnzide.

SELECT filename
FROM demo_ops.migration_ledger
WHERE filename IN (
  '062_partner_webhook_outbox.sql',
  '067_partner_webhook_test_event_atomic.sql',
  '069_partner_webhook_test_advisory_lock_fix.sql'
)
ORDER BY filename;
```

Expected before apply: only `062_partner_webhook_outbox.sql`.

## Verification queries (after 067 then 069)

```sql
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'enqueue_partner_webhook_test_delivery';
-- Expect one row: args = text

SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.partner_webhook_outbox'::regclass
  AND conname = 'partner_webhook_outbox_event_type_check';
-- Expect partner.webhook.test in the CHECK list

SELECT has_function_privilege('service_role', 'public.enqueue_partner_webhook_test_delivery(text)', 'EXECUTE') AS service_role_execute;
-- Expect true

SELECT has_function_privilege('anon', 'public.enqueue_partner_webhook_test_delivery(text)', 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', 'public.enqueue_partner_webhook_test_delivery(text)', 'EXECUTE') AS authenticated_execute;
-- Expect false, false

SELECT public.enqueue_partner_webhook_test_delivery('') ->> 'code' AS empty_partner_code;
-- Expect partner_id_required (function exists; no outbox insert)
```

## Warning

Never run this runbook on MAIN (`bztwutzprwsdrtqdpymf`), Production Vercel, or any production-activation path. DEMO-only. No Google OAuth changes.
