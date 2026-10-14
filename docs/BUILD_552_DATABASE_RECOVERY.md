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

## Encryption and key custody

- Keys are **operator-held** (`ABRAXAS_BACKUP_ENCRYPTION_KEY`), rotatable by re-encrypting artifacts with a new key.
- Store keys in a secrets manager or HSM-backed vault **separate** from backup blobs.
- **Key recovery:** maintain offline Shamir split or second custodian copy; document rotation in runbook.
- **Never** commit keys, connection URLs, or decrypted dumps to GitHub.

## Storage sovereignty

- Default output directory is local/private disk under `.abraxas-backups/` (gitignored).
- Copy encrypted `.enc` + `.manifest.json` to **any** access-controlled object store (self-hosted MinIO, S3-compatible bucket, encrypted volume) via `rsync`, `rclone`, or CI publish step — no vendor-specific SDK required in-repo.
- Replacing storage: copy blobs + manifests; decryption needs only the key and `pg_restore`.

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
