# Production native auth database recovery (144 + 145)

**Production project:** `bztwutzprwsdrtqdpymf`  
**Domain:** `https://abraxasworld.xyz`  
**Do not use staging project** `ocntwbxarpjeixdnzide` **as Production.**

This runbook applies only after **explicit operator authorization**. It does not change Vercel flags or secrets.

---

## 1. Immediate safety (current impact)

When `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=true` and migrations 144/145 are missing:

- **Connect** presents native passkey sign-in (not Passport, not Google).
- **`POST /api/auth/native/passkey/authenticate/options`** returns **HTTP 500** — ceremonies cannot start.
- **`GET /api/auth/native/enabled`** may show `enabled: true` and `config_ok: true` while **`schema.ok: false`** — configuration is green but persistence is not.

**User impact:** Visitors who click Connect hit a broken passkey path until the database is migrated or native auth is disabled.

### Emergency flag-off (no data loss)

1. Vercel → **abraxas-app** → Settings → Environment Variables → **Production**
2. Set `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` to `false` (or remove it)
3. **Redeploy Production** and wait for **READY**
4. Confirm: `GET https://abraxasworld.xyz/api/auth/native/enabled` → `"enabled": false`
5. Connect routes to **Passport** recovery (`/passport`) per PR #736 — not a permanent Google redirect

Native account tables (once created) and any future rows **remain** when the flag is off.

---

## 2. Migration safety assessment

### Files (source of truth)

- `supabase/migrations/144_native_account_webauthn.sql`
- `supabase/migrations/145_abraxas_webauthn_hardening.sql`

### Production schema compatibility (verified)

| Check | Result |
| --- | --- |
| Conflicting `abraxas_accounts` table | **None** (`to_regclass` is null) |
| Existing `abraxas_credentials` | **Unrelated** table; 144 does not alter it |
| Prerequisites | **`pgcrypto`** and **`uuid-ossp`** present |
| Migration 136 on Production | Present (`136_zklogin_native_auth_bridge`); no conflict with 144 |
| 144 alters existing partner/holder tables | **No** — only creates new `abraxas_*` native tables |
| 145 depends on 144 | **Yes** — alters `abraxas_account_partner_memberships`, index on `abraxas_sandbox_enrollments`, creates RPC |
| Existing native account data to preserve | **None** (tables absent) |

### Ordering

1. Apply **144** in a single transaction (creates tables, RLS, service_role grants).
2. Apply **145** in a single transaction (membership `status`, enrollment uniqueness, atomic RPC).

Do not apply 145 before 144.

### Security model (unchanged from staging)

- RLS enabled on all new native tables; **no** grants to `anon` / `authenticated`.
- **`service_role`** only (matches app PostgREST key).
- RPC **`abraxas_consume_webauthn_challenge_atomic`**: `SECURITY DEFINER`, `search_path` pinned, execute granted to **`service_role`** only.

---

## 3. Backup and recovery

**Before migration (operator):**

1. Supabase Dashboard → project **`bztwutzprwsdrtqdpymf`** → **Database** → confirm **Point-in-Time Recovery** / latest backup (note timestamp).
2. Optional: logical backup via Dashboard **Backups** or `pg_dump` from authorized connection (store encrypted, access-controlled).

**Rollback of migration (only if no production native accounts yet):**

- If **zero rows** in `abraxas_accounts`: operator may drop new native tables and RPC in a controlled window (see SQL appendix in repo script). **Never drop** if any production passkeys exist.
- Safer rollback: **flag off** (section 1) and leave schema in place.

**Not reversible without data loss:** dropping tables after users register passkeys.

---

## 4. Authorized execution (Production `bztwutzprwsdrtqdpymf`)

**Stop here until an operator replies with explicit authorization** (e.g. “Authorized: apply 144 and 145 to Production”).

### Option A — Supabase Dashboard SQL (recommended)

1. Open SQL Editor on **`bztwutzprwsdrtqdpymf`**
2. Paste and run **entire** contents of `144_native_account_webauthn.sql`; confirm success
3. Paste and run **entire** contents of `145_abraxas_webauthn_hardening.sql`; confirm success
4. Record execution time and operator id in change log

### Option B — Supabase CLI / MCP migration

Register migrations with the same SQL bodies and names:

- `144_native_account_webauthn`
- `145_abraxas_webauthn_hardening`

(Use the exact files from this repository commit on `main`.)

---

## 5. Post-migration SQL validation

Run `scripts/operations/native-auth-post-migration-validation.sql` on **Production**, or equivalent checks:

- All native tables exist
- RLS enabled (7 tables)
- RPC exists; probe call returns `ok: false` for fake id (not SQL error)
- Unique index `abraxas_sandbox_enrollments_account_partner_uq` exists
- Column `abraxas_account_partner_memberships.status` exists

### Application readiness

`GET https://abraxasworld.xyz/api/auth/native/enabled`

Required:

```json
{
  "enabled": true,
  "runtime": { "config_ok": true, "memory_store": false },
  "schema": { "ok": true },
  "production_readiness": { "blockers": [] }
}
```

Then:

- `POST .../passkey/authenticate/options` → **200** (not 500)

---

## 6. Controlled Production smoke (operator + authorized test passkey only)

1. Connect → WebAuthn → account session  
2. Applications → authorized org access  
3. Sign out / sign in → same `account_id`  
4. Sandbox enroll → Launchpad; repeat enroll → idempotent  

No automated agent should create Production tenants without explicit approval.

---

## 7. Monitoring

Watch 24–48h:

- 5xx on `/api/auth/native/passkey/*`
- `schema.ok` false on readiness endpoint
- Sandbox enroll errors
- Duplicate `abx_ac_*` subjects

**Critical failure:** flag-off (section 1), preserve DB rows.

---

## 8. Operator approval record

| Field | Value |
| --- | --- |
| Authorized by | _pending_ |
| Authorized at (UTC) | _pending_ |
| Backup confirmed | _pending_ |
| 144 applied | _pending_ |
| 145 applied | _pending_ |
| Validation SQL passed | _pending_ |
| Readiness endpoint green | _pending_ |
| Production smoke | _pending_ |
