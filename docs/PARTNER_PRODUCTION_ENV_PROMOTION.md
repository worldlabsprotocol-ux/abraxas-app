# Partner Production Environment Promotion

Operator runbook for hardened Production partner environment activation and reversal on `https://abraxasworld.xyz`.

## Scope

- **Activate:** add `"production"` to `partners.allowed_environments` after write-time readiness checks inside a single atomic RPC transaction.
- **Reverse:** remove production access, set `status = pilot`, **revoke all active `abx_live_*` keys**, and audit — atomically in the same RPC transaction.
- **Does not:** issue live keys automatically, publish policies, or expose secrets in API responses.

## Prerequisites

1. External partner promoted and onboarded (return URLs, assigned policy published and non-sandbox).
2. Migration `055_policy_immutable_versions.sql` applied — `partner_policies` may have **multiple rows per `id`** (draft, active, deprecated). This is normal.
3. Assigned policy family must have **exactly one** row with `status = 'active'` at activation time. Zero or multiple active versions fail closed inside the RPC (`policy_active = false`; no partner/key/audit writes).
4. Readiness preflight (`GET /api/admin/partner-flow/provisioning-preflight`) may be used as a **preview only** — the RPC decides on submit.
5. Allowlisted admin browser session on Production (no PIN on this path).

## Activate

1. Open `/admin/partner-flow/readiness`.
2. Enter `partner_id`, `policy_id`, and the exact HTTPS `return_url` used in Connect.
3. Confirm activation by re-typing the exact `partner_id`.
4. `POST /api/admin/partners/production-environment/activate` runs:
   - Deployment origin gate (404 off Production)
   - CSRF `Origin` check (403 on missing/mismatch)
   - Strict session auth (401; PIN rejected)
   - Atomic RPC with partner + policy row locks and write-time readiness

On success, issue a **new** live key manually via existing key admin when ready.

## Reverse

1. Use **Reverse production environment** on the same page.
2. Confirm by re-typing the exact `partner_id`.
3. RPC atomically:
   - Sets `allowed_environments = ['sandbox']`, `status = 'pilot'`
   - Sets `revoked_at` on all active `abx_live_*` keys for the partner
   - Inserts `admin.partner.production_env.reverse` audit event

**Old live keys remain revoked.** Re-activation requires intentionally issuing a **new** live key.

HTTP responses never include key IDs, prefixes, hashes, or revocation counts.

## Return URL allowlist parity

Activation readiness uses SQL helpers in migration `066_partner_production_env_promotion_atomic.sql` that mirror `lib/connect/returnUrlAllowlistSemantics.ts` — the same normalization and matching semantics as live Partner Flow callbacks (`lib/connect/returnUrlAllowlist.ts` → `lib/partner/relyingPartyFlow.ts`).

Golden fixture parity tests live in `lib/admin/partnerProductionEnvPromotion.test.ts`.

## RPC security

Function: `public.partner_production_env_promote_atomic`

- `SECURITY DEFINER` with `SET search_path = pg_catalog, public`
- All objects schema-qualified (`public.partners`, `public.partner_api_keys`, etc.)
- `REVOKE EXECUTE` from `anon` and `authenticated`
- `GRANT EXECUTE` to `service_role` (and `postgres` owner)

**Browser and direct PostgREST callers cannot invoke this RPC.** Only server-side Next.js routes using `SUPABASE_SERVICE_ROLE_KEY` call `sb.rpc(...)`.

### Post-migration privilege verification

Run after applying `066_partner_production_env_promotion_atomic.sql`:

```sql
SELECT has_function_privilege(
  'anon',
  'public.partner_production_env_promote_atomic(text,text,text,text,text)',
  'EXECUTE'
);  -- expect false

SELECT has_function_privilege(
  'authenticated',
  'public.partner_production_env_promote_atomic(text,text,text,text,text)',
  'EXECUTE'
);  -- expect false

SELECT has_function_privilege(
  'service_role',
  'public.partner_production_env_promote_atomic(text,text,text,text,text)',
  'EXECUTE'
);  -- expect true
```

## Audit

- Activate: `admin.partner.production_env.activate`
- Reverse: `admin.partner.production_env.reverse`
- `event_hash` is **NULL** in this batch (no new digest dependency)
- Metadata is non-PII only

## Migration assumptions

- Manual apply of `066_partner_production_env_promotion_atomic.sql` after review (not auto-applied from CI).
- Requires migration `055_policy_immutable_versions.sql` (composite `(id, version)` PK; multiple rows per policy `id`).
- Requires existing tables: `partners`, `partner_policies`, `partner_api_keys`, `audit_events`.
- Requires `service_role` `UPDATE` on `partners` and `partner_api_keys`, `INSERT` on `audit_events` (see `065_service_role_runtime_grants.sql`).
- No `pgcrypto` / digest extension required.

### Policy versioning (post-055)

After migration 055, a policy **family** (`partner_policies.id`) may contain draft, active, and deprecated version rows. Production activation does **not** assume a single row per `id`.

The RPC:

1. Locks the full policy family: `PERFORM 1 FROM public.partner_policies WHERE id = p_policy_id FOR UPDATE` (serializes with `publish_partner_policy_draft`).
2. Sets `policy_row_exists` when **any** version row exists for `id`.
3. Sets `policy_active` only when **exactly one** active version exists (`count(*) WHERE status = 'active' = 1`).
4. Validates partner match and sandbox rules **only** on that sole active row.
5. Fails closed when active count is 0 or >1 — `policy_partner_match` and `policy_not_sandbox` stay false; no promotion write occurs.

**Operator preflight (read-only):**

```sql
SELECT id,
       count(*) FILTER (WHERE status = 'active') AS active_rows,
       count(*) AS total_versions
FROM public.partner_policies
WHERE id = '<assigned_policy_id>'
GROUP BY id;
-- Expect active_rows = 1 before attempting activation.
```

Use `publish_partner_policy_draft` (migration 056) to publish drafts; never leave a policy family with zero or multiple active versions.

## Concurrency note

Policy or return-URL changes between UI preflight and POST are re-evaluated inside the RPC after `FOR UPDATE` locks on the partner row and the full policy-version family. UI preflight is never authoritative.
