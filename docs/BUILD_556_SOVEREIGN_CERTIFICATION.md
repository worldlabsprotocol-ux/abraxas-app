# Build #556 — Sovereign runtime certification

**Status:** PASS (disposable PostgreSQL, `postgres_direct`, no Supabase env)  
**Synthetic IDV:** All lifecycle IDV in this build uses labeled synthetic fixtures — not genuine human verification.

## 1. Independent runtime environment

| Component | Configuration |
|-----------|----------------|
| PostgreSQL (source) | `ABRAXAS_SOVEREIGN_PG_URL` / `ABRAXAS_DATABASE_URL` — disposable DB `sovereign_cert` |
| PostgreSQL (restore) | `ABRAXAS_SOVEREIGN_RESTORE_PG_URL` — disposable DB `sovereign_restore` |
| Persistence | `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct` |
| Evidence | `ABRAXAS_EVIDENCE_STORAGE_ROOT` + `ABRAXAS_EVIDENCE_ENCRYPTION_KEY` |
| Supabase | Cleared (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` empty) |

Schema: `SOVEREIGN_RUNTIME_SCHEMA_MANIFEST` (`lib/databaseRecovery/sovereignSchemaManifest.ts`) — includes `007_sui_zklogin.sql` (holder columns + recovery inventory) and `033_decision_receipts.sql`.

Apply:

```bash
export ABRAXAS_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/sovereign_cert
npm run sovereign-idv:apply-schema
```

Certify:

```bash
export ABRAXAS_SOVEREIGN_PG_URL="$ABRAXAS_DATABASE_URL"
export ABRAXAS_SOVEREIGN_RESTORE_PG_URL=postgresql://postgres:postgres@127.0.0.1:5432/sovereign_restore
npm run sovereign-runtime:certify-556
```

## 2. HTTP lifecycle results

| Boundary | Result |
|----------|--------|
| EVM Sepolia wallet → holder subject | PASS |
| Solana devnet wallet → holder subject | PASS |
| Auth challenge single-use (EVM + Solana) | PASS |
| Admin queue without credentials (`NODE_ENV=production`, PIN required) | 401 |
| Admin document-url path probe | 400/401/403 |
| Capture without valid session | ≥400 |
| Consent + encrypted custody + review + atomic approve + revoke (synthetic) | PASS |

## 3. Security and replay results

| Invariant | Evidence |
|-----------|----------|
| Cross-holder evidence access | `EvidenceAccessDeniedError` |
| Concurrent approve/reject | `build555Security.adversarial.test.ts` |
| JTI-scoped revocation | adversarial suite |
| Policy authorization filters revoked/low assurance | adversarial suite |
| Independent receipt verifier (no DB session) | offline phases; expired/deny → not authorizable |
| Receipt replay / duplicate consumption | covered in Build #555 adversarial + partner receipt suites in CI |

## 4. Encrypted backup and restore (Build #552)

| Step | Result |
|------|--------|
| Recovery inventory probe | PASS (19 tables after extended schema) |
| Encrypted `pg_dump` + manifest (`ABRAXAS_BACKUP_SCOPE=sovereign`) | PASS |
| Observed restore to second PostgreSQL | PASS |
| Inventory hash match post-restore | PASS |
| Evidence decrypt after filesystem copy | PASS |
| **Observed restore time** | ~464 ms (single run, `sovereign_restore_observed_ms`) |

## 5. Certification verdict

**PASS** — Abraxas Passport identity lifecycle, policy authorization paths, independent receipt checks, and sovereign backup/restore operate on Abraxas-controlled PostgreSQL and encrypted evidence without Supabase.

## 6. Blockers

None for disposable certification. Production promotion remains subject to founder merge approval and operational runbooks outside this build.

## 7. Defect fixed in this build

Atomic sovereign approval failed on disposable schema missing `identity_verifications.sui_address` (from `007_sui_zklogin.sql`). The sovereign schema manifest now applies that migration (and `033_decision_receipts.sql` for full recovery inventory).
