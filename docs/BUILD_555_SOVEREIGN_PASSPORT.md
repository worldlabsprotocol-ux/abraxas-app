# Build #555 — Sovereign Passport completion

## Sovereign HTTP paths (no Supabase)

When `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct`:

- `POST /api/identity/documents/capture` — Abraxas PG, encrypted evidence (`ABRAXAS_EVIDENCE_STORAGE_ROOT`), consent, rate limits, review sessions
- `GET /api/admin/identity/queue` — direct PostgreSQL queue
- `GET /api/admin/identity/document-url` — decrypt from custody-bound storage paths (admin-gated)
- `POST /api/admin/identity/approve` — reviewer identity from admin session only; direct review + atomic issuance (Build #554)

## Claims and policy reads

- `getActiveClaims` / `revokeSubjectClaims` — direct PostgreSQL when sovereign backend active
- `getPartnerPolicy` — direct PostgreSQL for partner policy binding

## Recovery inventory

`lib/databaseRecovery/pgInventory.ts` includes IDV tables, evidence custody, issuance audit, review audit, and age evidence metadata.

Encrypted evidence blobs live under `ABRAXAS_EVIDENCE_STORAGE_ROOT` and must be restored together with PostgreSQL custody rows (`abraxas_evidence_custody.storage_path`, `content_sha256`).

**Operational recovery certification** requires a successful restore rehearsal — not claimed by this build alone.

## Disposable test

```bash
export ABRAXAS_PERSISTENCE_BACKEND=postgres_direct
export ABRAXAS_DATABASE_URL=...
export ABRAXAS_EVIDENCE_STORAGE_ROOT=/tmp/abx-evidence
export ABRAXAS_EVIDENCE_ENCRYPTION_KEY=$(openssl rand -base64 32)
unset NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
npm run test:sovereign-runtime
```
