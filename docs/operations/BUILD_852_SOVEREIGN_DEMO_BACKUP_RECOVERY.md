# Build #852 — Sovereign Demo Backup and Verified Recovery

**Target:** Supabase Demo only (`ocntwbxarpjeixdnzide`). Production is out of scope.

**Authorization:** Read-only logical backup of Demo; restore into a disposable PostgreSQL 17 instance for verification. No Demo migrations, backfill, v1.1.0 activation, or billing.

## Tooling (Build #552)

| Step | Script |
|------|--------|
| Preflight (no dump) | `npx tsx scripts/database-recovery/audit-demo-database-access.ts` |
| Encrypted backup | `npx tsx scripts/database-recovery/backup-demo-database.ts` |
| Restore + manifest verify | `npx tsx scripts/database-recovery/restore-and-verify-demo-backup.ts` |
| Trust slice fingerprint | `npx tsx scripts/database-recovery/verify-demo-trust-slice.ts` |

## Required secrets (never commit)

| Variable | Purpose |
|----------|---------|
| `DEMO_SUPABASE_DATABASE_URL` | Authorized Demo direct/session connection (read-only backup role preferred) |
| `ABRAXAS_BACKUP_ENCRYPTION_KEY` | 32-byte key, base64 (`openssl rand -base64 32`) — **separate** from backup files |
| `ABRAXAS_BACKUP_OUTPUT_DIR` | Founder-controlled directory outside Supabase (default: `.abraxas-backups/demo`) |
| `ABRAXAS_RESTORE_DATABASE_URL` | Disposable local Postgres only (must pass `assertDisposableRestoreTarget`) |

Optional:

- `ABRAXAS_PG_DUMP_DOCKER=postgres:17-alpine` — use when host `pg_dump` is not major 17 (Demo runs **PostgreSQL 17.6**).
- `DEMO_SUPABASE_SSL_ROOT_CERT_PATH` — Supabase CA if required by connection policy.
- `ABRAXAS_RECOVERY_INVENTORY_PROFILE=demo_partner` — auto when `DEMO_SUPABASE_PROJECT_REF=ocntwbxarpjeixdnzide`.

## PostgreSQL 17 compatibility

Demo server version: **17.6**. `pg_dump` / `pg_restore` client major must be **17** for a supported logical backup path. On Ubuntu hosts with only PG16 clients, set `ABRAXAS_PG_DUMP_DOCKER=postgres:17-alpine` before backup (restore script uses `pg_restore` from the same image when wired similarly).

## Trust-state backup scope

Full logical dump includes all schemas present on Demo. Verification focuses on:

- Nine active v1.0.0 `decision_receipts` (IDs, `payload_hash`, signatures, `signing_key_id`)
- `verification_decisions`, `credential_claims`, `receipt_claim_dependencies`
- Application authorization and signed status tables present in Demo inventory
- Issuer authority / verification key references in public schema
- `demo_ops.migration_ledger` (ledger max filename in manifest snapshot)

**Documented absent on Demo (schema state, not export failure):**

- `decision_receipt_revocation_events` — table not present (`count = -1` in trust slice)
- `decision_receipt_evidence_dependencies` — table not present (`count = -1`)
- `reusable_eligibility_facts` / `reusable_eligibility_derivations` — empty (0 rows)
- Full 19-table IDV inventory — Demo uses `demo_partner` profile (10 tables)

## Operator sequence

```bash
export DEMO_SUPABASE_PROJECT_REF=ocntwbxarpjeixdnzide
export DEMO_SUPABASE_DATABASE_URL='…'          # founder-controlled
export ABRAXAS_BACKUP_ENCRYPTION_KEY='…'       # separate from backup dir
export ABRAXAS_BACKUP_OUTPUT_DIR="$HOME/abraxas-demo-backups"
export ABRAXAS_PG_DUMP_DOCKER=postgres:17-alpine   # if host pg_dump is not v17

npx tsx scripts/database-recovery/audit-demo-database-access.ts
npx tsx scripts/database-recovery/backup-demo-database.ts
# Note manifest_path and integrity_hash_sha256 from JSON stdout

docker run -d --name abraxas-demo-restore-852 \
  -e POSTGRES_PASSWORD=restore-local-only \
  -p 55432:5432 postgres:17-alpine

export ABRAXAS_RESTORE_DATABASE_URL='postgresql://postgres:restore-local-only@127.0.0.1:55432/postgres'
export ABRAXAS_BACKUP_MANIFEST_PATH="$ABRAXAS_BACKUP_OUTPUT_DIR/demo-ocntwbxarpjeixdnzide-….manifest.json"

npx tsx scripts/database-recovery/restore-and-verify-demo-backup.ts
npx tsx scripts/database-recovery/verify-demo-trust-slice.ts \
  | jq -S .trust_slice_fingerprint > /tmp/restored-trust.json
# Compare to source baseline (payload hashes + counts); signatures must match byte-for-byte in receipts array.
```

Restrict backup directory: `chmod 700 "$ABRAXAS_BACKUP_OUTPUT_DIR"`. Plaintext `.dump` is deleted after encryption in the backup script; restore temp dump is cleaned in `finally`.

## Source baseline (read-only, 2026-10-26 UTC)

Captured before encrypted backup execution in Cloud Agent (MCP read-only SQL). Use as post-restore comparison target:

| Metric | Value |
|--------|------|
| Receipts (active v1.0.0) | 9 |
| Verification decisions | 9 |
| Credential claims | 72 |
| Receipt claim dependencies | 11 |
| Reusable eligibility facts / derivations | 0 / 0 |
| Revocation events table | absent |
| Evidence dependencies table | absent |
| `demo_ops.migration_ledger` max | `065_service_role_runtime_grants.sql` |
| Postgres | 17.6 |

Operator copy of receipt `payload_hash` values (no signatures in this doc): see artifact `demo-trust-fingerprint-source-852.json` on the Build #852 agent run.

**Trust slice SHA-256 (artifact `demo-trust-fingerprint-source-852.json`, includes signatures):** `30139a78720d8d2bb2ee9eb137390abd7d3193fd967c0f16559b2e4db714b972`

## Cloud Agent execution status

**Backup not created in agent environment:** `DEMO_SUPABASE_DATABASE_URL` and `ABRAXAS_BACKUP_ENCRYPTION_KEY` were not available in the runner. **Isolated restore verification not run** (depends on ciphertext).

## Migration recommendation

**NO-GO** for Demo migrations (`059 → 113 → 151 → 152 → 153`) until:

1. Encrypted backup exists in founder-controlled storage, and  
2. Disposable PostgreSQL 17 restore passes manifest + trust-slice verification against the source baseline.

A backup that has never been restored is not yet a proven recovery plan.
