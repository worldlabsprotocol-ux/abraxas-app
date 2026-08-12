# Partner Sandbox Demo — Environment Runbook

**Current state:** Phase A supplies **read-only validation only**. It cannot provision, clean up, migrate, or modify a database.

This runbook describes the isolated demo environment at `https://demo.abraxasworld.xyz` (not yet provisioned). Do not apply steps that mutate Production, Supabase, Vercel, Google OAuth, or DNS until explicitly approved.

## Objective

Operate a stable presenter environment that:

- Uses a **separate Supabase demo project** (recommended) or branch
- Deploys via **Vercel Custom Environment** or dedicated Preview with stable domain
- Uses **synthetic identity data only**
- Reuses existing Abraxas policy, receipt, validation, metering, and webhook **code paths**
- Creates **no Production database records**

## Architecture

```
demo.abraxasworld.xyz  →  Vercel demo environment
        │
        ▼
Isolated Supabase project
  ├── Migrations (see demoMigrationManifest.ts)
  ├── abraxas-partner-sandbox / partner-sandbox-gate-v1
  └── Synthetic holder (Phase B provisioner — not yet implemented)
```

Production (`abraxasworld.xyz`) remains isolated: separate project ref, secrets, cookies, and signing keys. The production Supabase project reference is a **non-secret deployment identifier** committed in `scripts/demo/lib/knownProductionSupabaseProjectRefs.ts`. Changing production Supabase projects requires a **reviewed repository update** to that immutable denylist.

## Phase A — Read-only validation

The validator remains intentionally unusable until **both** `DEMO_SUPABASE_PROJECT_REF` and `PRODUCTION_SUPABASE_PROJECT_REF` are configured correctly against the immutable denylist.

### Prerequisites

Set non-secret guard variables in `.env.demo.local` (never commit). **Do not store `SUPABASE_SERVICE_ROLE_KEY` in any file.**

```bash
DEMO_SUPABASE_PROJECT_REF=<demo-project-ref>
PRODUCTION_SUPABASE_PROJECT_REF=bztwutzprwsdrtqdpymf
# Optional extra denylist:
# DEMO_DENIED_SUPABASE_PROJECT_REFS=<ref-a>,<ref-b>
NEXT_PUBLIC_SUPABASE_URL=https://<demo-project-ref>.supabase.co
# Optional until Phase B:
PARTNER_SANDBOX_DEMO_SUBJECT_ID=0x...
```

`SUPABASE_SERVICE_ROLE_KEY` is required for REST validation only. Provide it at runtime via a hidden Bash prompt (input not echoed), then unset it immediately after validation completes.

Write-only required tables (currently `audit_events`, INSERT-only per migration 065) are **UNVERIFIABLE** in REST mode and do not fail REST exit status. Use catalog mode for authoritative existence and INSERT privilege evidence.

### Run validation

**REST mode** (requires demo `service_role` key at runtime only):

```bash
set -a
source .env.demo.local
set +a
read -rsp "Demo SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
echo
npm run demo:validate
unset SUPABASE_SERVICE_ROLE_KEY
```

**Catalog mode** (no `service_role` key; uses database URL + CA from `.env.demo.local`):

```bash
DOTENV_CONFIG_PATH=.env.demo.local npm run demo:validate -- --catalog --confirm <demo-ref>
```

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Ready — required schema and sandbox seeds present |
| 1 | Missing or incorrect database requirements |
| 2 | Unsafe or invalid configuration (ref mismatch, invalid subject, etc.) |

## Canonical migration manifest

A fresh Supabase project requires **more than migrations 018 onward**. The dependency-ordered manifest lives in:

`scripts/demo/lib/demoMigrationManifest.ts`

### Summary (required tier)

| Order | Migration | Creates / seeds |
|------:|-----------|-------------------|
| 1 | `006_abraxas_id.sql` | `identity_verifications`, `abraxas_credentials` |
| 2 | `007_sui_zklogin.sql` | Sui columns on identity tables |
| 3 | `020_identity_verification_state_machine.sql` | IDV state machine columns |
| 4 | `018_policy_verification.sql` | `credential_claims`, `wallet_bindings`, `partner_policies`, verification tables |
| 5 | `019_trust_registry_complete.sql` | `credential_issuers` |
| 6 | `024_partner_api_keys.sql` | `partner_api_keys`, `partner_api_usage` |
| 7 | `025_partners_registry.sql` | `partners` |
| 8 | `032_reconcile_sandbox_and_cielo_operator_workflow.sql` | Sandbox partner + policy seeds |
| 9 | `033_decision_receipts.sql` | `decision_receipts` |
| 10 | `034_credential_status_registry.sql` | Status registry + receipt dependencies |
| 11 | `035_issuer_framework_trust_registry.sql` | `issuer:abraxas-sandbox` seed |
| 12 | `036_connect_wallet_authority.sql` | `wallet_bindings.binding_status` |
| 13 | `053_partner_flow_idempotency.sql` | `verification_decisions.idempotency_key` |
| 14 | `055_policy_immutable_versions.sql` | Policy versioning |
| 15 | `056_publish_partner_policy_draft_rpc.sql` | Publish RPC |
| 16 | `058_partner_metering_foundation.sql` | Metering tables |
| 17 | `062_partner_webhook_outbox.sql` | Webhook outbox (delivery disabled by default) |
| 18 | `065_service_role_runtime_grants.sql` | Explicit `service_role` table grants (after catalog evidence) |

**Do not run:** `028`–`031` (superseded by `032`), `018_policy_verification_repair.sql` (destructive).

### Why migration 065 exists

Authoritative read-only **catalog validation** (`npm run demo:validate -- --catalog --confirm <demo-ref>`) confirmed on the isolated demo project:

- all 19 required tables, RLS, 26 indexes, `publish_partner_policy_draft` RPC, and sandbox seeds are present;
- every expected `service_role` table privilege was **missing**.

REST-mode validation (`npm run demo:validate`) produced `permission denied` false negatives for the same reason: the demo project keeps **“Automatically expose new tables” disabled**, so PostgREST with `SUPABASE_SERVICE_ROLE_KEY` cannot reach tables until explicit `GRANT`s exist.

Migration `065_service_role_runtime_grants.sql` adds **only** audited, per-table `service_role` grants. It does **not**:

- enable automatic table exposure or default privileges in the Supabase dashboard;
- grant `DELETE`, `TRUNCATE`, `REFERENCES`, or `TRIGGER`;
- grant privileges to `anon` or `authenticated`;
- revoke or alter existing privileges (`GRANT USAGE ON SCHEMA public` is idempotent).

Catalog privilege checks cover **24 tables** (19 required runtime tables plus 5 adjacent call-site tables). Schema/RLS required-table checks remain scoped to the 19-table demo runtime set.

**Deployment scope:** `065` is a **general server-runtime privilege correction**, not a demo-only schema change. It is **not** applied automatically by Vercel deployment or repository merge. Production Supabase application requires a **separate reviewed operator decision**. After merge, the **only authorized immediate apply target** is the isolated demo project `ocntwbxarpjeixdnzide` via the guarded `npm run demo:migrate -- --apply` workflow.

**Atomicity:** `065` is one fixed PL/pgSQL `DO` block. Role assertion, all 24 fixed `to_regclass` table assertions, `GRANT USAGE`, and all 62 table grants execute as a single independently atomic unit. Any failure rolls back every grant made by that block, even when executed outside the demo runner.

### Re-applying migrations on a database that already has 001–017 ledgered

When `demo_ops.migration_ledger` already contains the first 17 manifest files with matching `sha256` hashes, the guarded runner **skips** those files and applies **only** `065_service_role_runtime_grants.sql`. Hashes for the existing 17 files are immutable; do not edit ledgered migration sources in place.

### Platform prerequisites (fresh Supabase project)

- **PostgreSQL 15+** on Supabase (006 uses `gen_random_uuid()` before 018 installs `pgcrypto`)
- **`pgcrypto`** — installed by `018_policy_verification.sql`; required for later digest/crypto helpers
- **`uuid-ossp`** — only required by out-of-scope `001_tokenization_requests.sql`
- **Migrations 001–005** — not required for Partner Sandbox demo runtime paths

Extension catalog verification is **UNVERIFIABLE** via Supabase REST in Phase A; missing extensions must be caught during migration apply or a future read-only RPC. **UNVERIFIABLE** results are not security validation successes.

RLS, `pg_policies`, `pg_indexes`, functions/RPCs, and `information_schema` column catalog checks are **UNVERIFIABLE** through REST in Phase A. Use **catalog mode** (below) for authoritative structural validation.

### Bash — REST validation (PostgREST)

```bash
export DEMO_SUPABASE_PROJECT_REF="<demo-project-ref>"
export PRODUCTION_SUPABASE_PROJECT_REF="bztwutzprwsdrtqdpymf"
export NEXT_PUBLIC_SUPABASE_URL="https://<demo-project-ref>.supabase.co"
# Optional until Phase B:
# export PARTNER_SANDBOX_DEMO_SUBJECT_ID="0x<64-hex-chars>"

read -rsp "Demo SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
echo
npm run demo:validate
unset SUPABASE_SERVICE_ROLE_KEY
```

### Bash — catalog validation (direct Postgres, read-only)

Catalog mode uses `DEMO_SUPABASE_DATABASE_URL` and verified TLS only. It does **not** require or print `SUPABASE_SERVICE_ROLE_KEY`.

```bash
export DEMO_SUPABASE_PROJECT_REF="<demo-project-ref>"
export PRODUCTION_SUPABASE_PROJECT_REF="bztwutzprwsdrtqdpymf"
export NEXT_PUBLIC_SUPABASE_URL="https://<demo-project-ref>.supabase.co"
export DEMO_SUPABASE_DATABASE_URL="postgresql://postgres.<demo-project-ref>:<password>@<region>.pooler.supabase.com:5432/postgres"
export DEMO_SUPABASE_SSL_ROOT_CERT_PATH="<operator-local-path>/supabase-demo-ca.crt"

npm run demo:validate -- --catalog --confirm <demo-project-ref>
```

Save sanitized output locally (optional):

```bash
mkdir -p reports
npm run demo:validate -- --catalog --confirm <demo-project-ref> \
  | tee "reports/demo-validate-catalog-$(date -u +%Y%m%dT%H%M%SZ).log"
```

Rejected automatically before any database connection: production denylist match, ref mismatch, missing or incorrect `--confirm`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, session pooler without `DEMO_SUPABASE_SSL_ROOT_CERT_PATH`, and TLS-weakening connection-string query parameters on pooler URLs.

Catalog mode runs `BEGIN TRANSACTION READ ONLY`, applies fixed local timeouts (`statement_timeout=30s`, `lock_timeout=5s`, `idle_in_transaction_session_timeout=30s`), verifies `transaction_read_only=on` and `current_database()='postgres'`, executes only hardcoded allowlisted `SELECT` statements from `scripts/demo/lib/demoCatalogQueryRegistry.ts`, then `ROLLBACK` and closes the connection. It never mutates schema or data.

## Phase B — Database bootstrap (manifest-scoped migrations)

**Current state:** `npm run demo:migrate` performs a **dry-run by default**. It does not connect to a database unless you pass `--apply` with an explicit confirmation matching `DEMO_SUPABASE_PROJECT_REF`. No provisioning or cleanup tooling exists yet.

### PowerShell — local shell-only credentials

Create `.env.demo.local` in the repository root (gitignored). Use **variable names only** below; paste values locally and never commit them.

```powershell
# Required safety + demo target (names only — set values locally)
$env:DEMO_SUPABASE_PROJECT_REF = "<demo-project-ref>"
$env:PRODUCTION_SUPABASE_PROJECT_REF = "bztwutzprwsdrtqdpymf"
$env:NEXT_PUBLIC_SUPABASE_URL = "https://<demo-project-ref>.supabase.co"
# Apply mode only (not required for dry-run):
# $env:DEMO_SUPABASE_DATABASE_URL = "<demo-direct-db-connection-string>"
# Optional:
# $env:DEMO_DENIED_SUPABASE_PROJECT_REFS = "<ref-a>,<ref-b>"
```

Load from file without bash `source` / `set -a`:

```powershell
Get-Content .env.demo.local | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $name, $value = $_ -split '=', 2
  Set-Item -Path "Env:$name" -Value $value
}
```

### PowerShell — dry-run (fully offline)

Dry-run requires only the guard variables above. It performs **no DNS lookup, database connection, ledger creation, or SQL execution**.

```powershell
npm run demo:migrate
```

Expected output:
- masked demo project ref;
- masked database target derived from `DEMO_SUPABASE_PROJECT_REF` only;
- exact 18-file manifest order with `sha256` hashes and transaction mode (`055_policy_immutable_versions.sql` reports `normalized_transaction_wrapper`; `065_service_role_runtime_grants.sql` reports `atomic_wrapper`);
- `No DNS lookup, database connection, ledger creation, or SQL execution performed.`

Save sanitized output locally (optional):

```powershell
New-Item -ItemType Directory -Force -Path reports | Out-Null
npm run demo:migrate | Out-File -FilePath ("reports\demo-migrate-dryrun-{0}.log" -f (Get-Date -Format "yyyyMMddTHHmmssZ")) -Encoding utf8
```

### PowerShell — apply (explicit approval only)

**Do not run until operator review approves.** Requires `--apply` and `--confirm` equal to `DEMO_SUPABASE_PROJECT_REF`.

The runner accepts **one of two approved transports**:

1. **Direct** — `db.<demo-project-ref>.supabase.co:5432` with username `postgres`
2. **IPv4 Session Pooler** — `*.pooler.supabase.com:5432` with username `postgres.<demo-project-ref>` and verified TLS via a local Supabase CA file

**Why only Session Pooler (not Transaction Pooler)?** Port `6543` is the Supabase **transaction** pooler. It cannot hold session-scoped PostgreSQL advisory locks across statements, which the migration runner requires. Port `5432` on `*.pooler.supabase.com` is the **session** pooler: one backend connection for the whole client session, so advisory locks, transactions, and ledger writes remain atomic. Use the session pooler when direct `db.<ref>.supabase.co` is unreachable (for example IPv6-only endpoints from IPv4-only networks).

**Why verified TLS with a local CA file?** Supabase Session Pooler presents a certificate signed by the Supabase project CA, not a public Web PKI root in Node's default trust store. A prior apply attempt reached TLS setup but failed with `self-signed certificate in certificate chain` before authentication or SQL execution. The runner therefore requires the official Supabase database CA downloaded from the demo project's database/SSL settings, saved **outside the repository**, and referenced only through the local environment variable `DEMO_SUPABASE_SSL_ROOT_CERT_PATH`. Do **not** commit the CA file. Do **not** set `NODE_TLS_REJECT_UNAUTHORIZED=0`. Do **not** put `sslmode`, `sslrootcert`, or other TLS parameters in the connection string — verified TLS is configured explicitly by the runner.

**Direct example (placeholders only):**

```powershell
$env:DEMO_SUPABASE_DATABASE_URL = "postgresql://postgres:<password>@db.<demo-project-ref>.supabase.co:5432/postgres"
npm run demo:migrate -- --apply --confirm <demo-project-ref>
```

**IPv4 Session Pooler example (placeholders only):**

1. In the isolated demo Supabase project, open **Database → SSL** and download the official database CA certificate.
2. Save it outside the repository, for example `C:\operator\secrets\supabase-demo-ca.crt` or `~/secrets/supabase-demo-ca.crt`.
3. Set the local-only CA path and a pooler URL **without** TLS query parameters:

```powershell
$env:DEMO_SUPABASE_SSL_ROOT_CERT_PATH = "C:\operator\secrets\supabase-demo-ca.crt"
$env:DEMO_SUPABASE_DATABASE_URL = "postgresql://postgres.<demo-project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
npm run demo:migrate -- --apply --confirm <demo-project-ref>
```

Rejected automatically: transaction pooler port `6543`, username `postgres` without the demo ref on a pooler host, production refs, deceptive hostnames, TLS query parameters in the connection string, missing `DEMO_SUPABASE_SSL_ROOT_CERT_PATH`, unreadable CA files, and TLS-weakening environment overrides.

The authoritative ledger is `demo_ops.migration_ledger` in the isolated demo database. The runner acquires a PostgreSQL advisory lock, initializes `demo_ops` idempotently, and stops on the first error. Migration `055_policy_immutable_versions.sql` uses `normalized_transaction_wrapper`: the runner strips only top-level `BEGIN;` / `COMMIT;` from an execution copy, records the original source `sha256` in the ledger, and applies both inside one outer transaction. Migration `065_service_role_runtime_grants.sql` is `atomic_wrapper` and additionally self-atomic via one fixed `DO` block (assertions + grants roll back together independent of the runner).

On a database that already ledgered migrations 1–17, apply mode skips those files when hashes match and executes only `065_service_role_runtime_grants.sql`. Do **not** apply `065` to production Supabase without a separate reviewed operator decision; authorized immediate target after merge is demo project `ocntwbxarpjeixdnzide` only.

### PowerShell — post-migration REST validation

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = Read-Host "Demo SUPABASE_SERVICE_ROLE_KEY" -AsSecureString
# Convert SecureString to plain text only for the current process, then clear:
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:SUPABASE_SERVICE_ROLE_KEY)
$env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
npm run demo:validate | Out-File -FilePath "reports\demo-validate-$(Get-Date -Format yyyyMMddTHHmmssZ).log" -Encoding utf8
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
```

### PowerShell — post-migration catalog validation

Catalog mode uses the database URL and verified CA only. Do **not** set `SUPABASE_SERVICE_ROLE_KEY` for catalog runs.

```powershell
$env:DEMO_SUPABASE_PROJECT_REF = "<demo-project-ref>"
$env:PRODUCTION_SUPABASE_PROJECT_REF = "bztwutzprwsdrtqdpymf"
$env:NEXT_PUBLIC_SUPABASE_URL = "https://<demo-project-ref>.supabase.co"
$env:DEMO_SUPABASE_DATABASE_URL = "postgresql://postgres.<demo-project-ref>:<password>@<region>.pooler.supabase.com:5432/postgres"
$env:DEMO_SUPABASE_SSL_ROOT_CERT_PATH = "C:\operator\secrets\supabase-demo-ca.crt"

New-Item -ItemType Directory -Force -Path reports | Out-Null
npm run demo:validate -- --catalog --confirm <demo-project-ref> `
  | Out-File -FilePath ("reports\demo-validate-catalog-{0}.log" -f (Get-Date -Format "yyyyMMddTHHmmssZ")) -Encoding utf8
```

Record only `PASS` / `FAIL` / `UNVERIFIABLE` / `WARN` lines. **UNVERIFIABLE is not a security success.**

### Forbidden during bootstrap

- `supabase db push` or bulk migration discovery
- Applying files outside `DEMO_REQUIRED_MIGRATION_ORDER`
- Excluded migrations `028`–`031` or `018_policy_verification_repair.sql`
- Production credentials, backups, or copied rows/storage
- Arbitrary file arguments to the migration runner

## Phase B — Future provisioning (not implemented)

The offline provisioner (`scripts/demo/provision-partner-sandbox-holder.ts`) will:

- **Generate** the synthetic subject itself (no `--subject-id` flag)
- Call internal library functions directly (`issueManualIdentityCredential`, `applySandboxScreeningClear`)
- Write state to `scripts/demo/.sandbox-holder.json` (gitignored) with demo project ref + subject
- Refuse cleanup if project ref differs from state file
- Stop if any claim would be production-usable outside sandbox policy scope
- **Not** require Google OAuth, `PILOT_TIER3_SCREENING`, or `/api/credentials/issue`

## Stable domain and OAuth (documentation only)

When the demo environment is created:

| Item | Value |
|------|-------|
| Vercel domain | `demo.abraxasworld.xyz` |
| DNS | `CNAME demo → Vercel` |
| Google OAuth origin | `https://demo.abraxasworld.xyz` |
| zkLogin redirect | `https://demo.abraxasworld.xyz/auth/zklogin/callback` |
| `NEXT_PUBLIC_APP_URL` | `https://demo.abraxasworld.xyz` |
| `ABRAXAS_ISSUER_URL` | `https://demo.abraxasworld.xyz` |

Cookies are host-scoped; demo sessions do not cross to Production.

## Activation sequence (full environment — future)

1. Create isolated Supabase demo project
2. Apply canonical migrations (manifest order)
3. Run `npm run demo:validate` (exit 0)
4. Configure Vercel demo environment variables
5. Attach `demo.abraxasworld.xyz`
6. Configure Google OAuth (demo client)
7. Run Phase B provisioner (when implemented)
8. Set `PARTNER_SANDBOX_DEMO_SUBJECT_ID` + `PARTNER_SANDBOX_DEMO_ENABLED=true`
9. Redeploy demo environment
10. Five-minute rehearsal (`docs/demo/PARTNER_SANDBOX_PHASE1_SCRIPT.md`)
11. Test cleanup + reprovision cycle

## Related docs

- `docs/demo/DEMO_VARIABLE_MATRIX.md`
- `docs/demo/DEMO_SECURITY_CHECKLIST.md`
- `docs/demo/REST_VALIDATION_OPERATOR_CHECKLIST.md` - REST vs catalog divergence
- `docs/demo/PARTNER_SANDBOX_PHASE1_SCRIPT.md`
- `docs/TIER3_AND_RELYING_PARTNERS.md`
