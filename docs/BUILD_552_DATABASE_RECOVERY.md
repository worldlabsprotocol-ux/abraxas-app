# Build #552 — Abraxas-owned database backup and recovery

Abraxas treats Supabase as a replaceable database operator. Recovery authority lives in Abraxas-controlled **pg_dump** artifacts, **encryption keys**, **manifests**, and **disposable restore** procedures — not Supabase paid backup, PITR, or branching.

## Scope

| Target | Project ref | Policy |
|--------|-------------|--------|
| Authorized demo backup source | `ocntwbxarpjeixdnzide` | Backup only with `DEMO_SUPABASE_DATABASE_URL` |
| Production | `bztwutzprwsdrtqdpymf` | **Denied** — guards fail closed |
| Restore | Independently provisioned PostgreSQL | **Never** `*.supabase.co` / pooler hosts |

## Access audit (demo)

- **Supabase REST / anon / service-role JWT** — application API access only; **not** a substitute for PostgreSQL wire protocol backup.
- **Consistent backup** requires **`DEMO_SUPABASE_DATABASE_URL`**: Session Pooler (`postgres.<ref>@…pooler.supabase.com:5432`) or direct `db.<ref>.supabase.co:5432` with verified TLS (see `scripts/demo/lib/demoDatabaseUrl.ts`).
- **Operator audit (no dump):** `npm run database-recovery:audit-demo`

### Obtain demo PostgreSQL connection string (secure — no credentials in git)

Use the Supabase Dashboard for project **`ocntwbxarpjeixdnzide` only**. Do **not** use Production (`bztwutzprwsdrtqdpymf`).

1. Sign in to [Supabase Dashboard](https://supabase.com/dashboard) with an account that has access to the **partner demo** project.
2. Open project **abraxas-partner-demo** (ref `ocntwbxarpjeixdnzide`).
3. Go to **Project Settings → Database**.
4. Under **Connection string**, choose **URI** and one of:
   - **Session pooler** (recommended for `pg_dump`): host `*.pooler.supabase.com`, port **5432**, user `postgres.ocntwbxarpjeixdnzide`, database `postgres`.
   - **Direct connection**: host `db.ocntwbxarpjeixdnzide.supabase.co`, port **5432**, user `postgres`, database `postgres`.
5. Use **Reset database password** if you do not already have the current password. Copy the URI **once** into a secrets manager (1Password, Vault, etc.) — not email, not Slack, not the repo.
6. On the operator machine only, export the URI as an environment variable (shell example — replace placeholders locally):

```bash
export DEMO_SUPABASE_PROJECT_REF=ocntwbxarpjeixdnzide
export PRODUCTION_SUPABASE_PROJECT_REF=bztwutzprwsdrtqdpymf
export NEXT_PUBLIC_SUPABASE_URL=https://ocntwbxarpjeixdnzide.supabase.co
export DEMO_SUPABASE_DATABASE_URL='postgresql://postgres.[REF]:[PASSWORD]@[HOST]:5432/postgres'
export ABRAXAS_BACKUP_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

7. For Session pooler TLS, follow `scripts/demo/lib/demoSslRootCert.ts` / set `DEMO_SUPABASE_SSL_ROOT_CERT_PATH` when required by your runner.
8. Verify without dumping: `npm run database-recovery:audit-demo` (output must show masked targets only).

**Never** paste the real URI into issues, PRs, or logs. Scripts redact `DEMO_SUPABASE_DATABASE_URL` on errors.

## Tooling

| Script | Purpose |
|--------|---------|
| `npm run database-recovery:backup-demo` | Encrypted custom-format `pg_dump` + manifest + audit log |
| `npm run database-recovery:restore-verify` | Decrypt → `pg_restore` → inventory/integrity hash verify |
| `npm run database-recovery:rehearse-idv` | Apply 7-file IDV manifest twice on **restore DB only** |
| `npm run test:database-recovery` | Unit + optional disposable integration cycle |

### Environment

**Backup (demo only)**

- `DEMO_SUPABASE_PROJECT_REF=ocntwbxarpjeixdnzide`
- `PRODUCTION_SUPABASE_PROJECT_REF=bztwutzprwsdrtqdpymf`
- `NEXT_PUBLIC_SUPABASE_URL=https://ocntwbxarpjeixdnzide.supabase.co`
- `DEMO_SUPABASE_DATABASE_URL` — Postgres connection string (secret; never commit)
- `ABRAXAS_BACKUP_ENCRYPTION_KEY` — `openssl rand -base64 32` (32-byte key, base64)
- Optional: `ABRAXAS_BACKUP_OUTPUT_DIR` (default `.abraxas-backups/demo`)
- Optional: `ABRAXAS_BACKUP_KEEP_LAST` (default `7`)

**Restore (disposable only)**

- `ABRAXAS_BACKUP_MANIFEST_PATH` — path to `*.dump.enc.manifest.json`
- `ABRAXAS_RESTORE_DATABASE_URL` — `postgresql://…@localhost/…` (or dedicated VM with `ABRAXAS_RESTORE_ALLOW_NONLOCALHOST=1`)
- Same `ABRAXAS_BACKUP_ENCRYPTION_KEY` as backup

## Artifact layout

```
.abraxas-backups/demo/
  audit.jsonl
  demo-ocntwbxarpjeixdnzide-<timestamp>.dump.enc
  demo-ocntwbxarpjeixdnzide-<timestamp>.dump.enc.manifest.json
```

Manifest (`manifest_version: 1`) records:

- Database identity (Supabase ref)
- Supabase migration version list snapshot
- Canonical **inventory counts** (identity, credentials, wallet bindings, receipts, audit)
- **Integrity fingerprints** (MD5 aggregates over IDV / subjects / wallets — no row payloads)
- SHA-256 of plaintext dump and ciphertext
- Encryption scheme: `aes-256-gcm-v1` (IV + tag + ciphertext)

Plaintext dumps are removed from disk immediately after encryption.

### Backup consistency (schema + identity data)

- **`pg_dump --format=custom`** captures **schema and data** in a single PostgreSQL dump transaction (consistent snapshot at dump start).
- Optional **`ABRAXAS_BACKUP_SERIALIZABLE_DEFERRABLE=1`** adds `--serializable-deferrable` when the server supports it (stronger snapshot isolation; disable if the pooler rejects it).
- Before dump, **`assertBackupSourceReady`** requires all recovery inventory tables to exist so post-restore verification is meaningful.
- Inventory + integrity hashes in the manifest cover identity verifications, credentials, wallet bindings, zkLogin rows, receipts, and audit events (counts + non-content fingerprints).

## Encryption and key custody

- Keys are **operator-held** (`ABRAXAS_BACKUP_ENCRYPTION_KEY`), rotatable by re-encrypting artifacts with a new key.
- Store keys in a secrets manager or HSM-backed vault **separate** from backup blobs.
- **Key recovery:** maintain offline Shamir split or second custodian copy; document rotation in runbook.
- **Never** commit keys, connection URLs, or decrypted dumps to GitHub.

## Storage sovereignty

- Default output directory is local/private disk under `.abraxas-backups/` (gitignored).
- Copy encrypted `.enc` + `.manifest.json` to **any** access-controlled object store (self-hosted MinIO, S3-compatible bucket, encrypted volume) via `rsync`, `rclone`, or CI publish step — no vendor-specific SDK required in-repo.
- Replacing storage: copy blobs + manifests; decryption needs only the key and `pg_restore`.

### Offsite durability checklist

- Store **ciphertext + manifest + encryption key** in separate systems (key never in the same bucket as blobs).
- Enable **versioning** or immutable retention on the object store; keep at least two geographic/ provider-independent copies.
- After upload, run **`database-recovery:restore-verify`** on a disposable host using the offsite manifest path (download to local disk first).
- Log backup/restore events in `audit.jsonl` and archive audit files with the same retention as backups.

## Restore verification (tamper / wrong environment)

Restore **fails closed** when:

- Manifest **project ref** is not authorized demo or matches a **production** denylist entry.
- Manifest **ciphertext filename** does not match the `.enc` file path (manifest binding).
- **Ciphertext SHA-256** does not match manifest (truncation or tampering before decrypt).
- **AES-GCM decrypt** fails (wrong key or bit-flipped ciphertext/tag).
- **Plaintext SHA-256** after decrypt does not match manifest.
- Restored DB **inventory/integrity hashes** do not match manifest post-`pg_restore`.
- Restore target is a **Supabase** host or references **production** refs in URL components.

## Retention and audit

- After each successful backup, `pruneBackupArtifacts` retains the newest `ABRAXAS_BACKUP_KEEP_LAST` encrypted backups (+ manifests).
- `audit.jsonl` append-only events: `backup_*`, `restore_*`, `verify_*`, `idv_rehearsal_completed`.

## Recovery objectives (realistic)

| Metric | Target | Notes |
|--------|--------|-------|
| **RPO** | ≤ 24 h (daily backup) or ≤ 1 h with scheduled runner | Bounded by backup cadence |
| **RTO** | 2–4 h | Restore + verify + app config on fresh Postgres |
| **Proof** | Mandatory | Restore to disposable DB + hash match + optional IDV rehearsal |

## Restore procedure (independent Postgres)

1. Provision disposable PostgreSQL 15+ (version ≥ source major recommended).
2. Set `ABRAXAS_RESTORE_DATABASE_URL` to disposable instance.
3. Run `database-recovery:restore-verify` with manifest + key.
4. Point staging app at restore URL (temporary) or export verified counts for sign-off.
5. Schedule **quarterly** restore drill; log result in `audit.jsonl`.

## IDV migration activation (rehearsal only)

Seven-file manifest (shared with demo IDV recovery):

`021`, `036`, `037`, `050`, `051`, `079`, `137`

Rehearse on **restored disposable** DB:

`npm run database-recovery:rehearse-idv`

**Do not** apply to shared demo `ocntwbxarpjeixdnzide` without explicit founder authorization and a certified backup.

## Production protection

- `KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS` denylist
- `validateReadOnlyDemoConfig` + `assertDemoBackupScope`
- Restore guard blocks Supabase hosts and production refs in URL components
