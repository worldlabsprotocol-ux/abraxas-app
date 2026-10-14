# Build #553 — Sovereign infrastructure foundation

Abraxas-owned **PostgreSQL** becomes the persistence authority for the core Passport identity path. Supabase remains a **compatibility transport** (PostgREST) until cutover; it is not the long-term recovery or identity authority (see Build #552).

## Runtime dependency audit (summary)

| Surface | Today | Sovereign target |
|---------|--------|------------------|
| **PostgreSQL data** | Supabase-hosted or disposable PG | Abraxas-operated Postgres (`ABRAXAS_DATABASE_URL`) |
| **Server DB access** | PostgREST + service role (`@supabase/supabase-js`) | **`postgres_direct`** for identity path |
| **Supabase Auth** | zkLogin / hosted holder (legacy) | Unchanged behind compatibility boundary |
| **Storage** | Supabase buckets for IDV blobs | **`ABRAXAS_EVIDENCE_STORAGE_ROOT`** encrypted files |
| **IDV persistence** | PostgREST tables + RLS | Direct PG + portable SQL migrations |
| **Receipt verify** | Ed25519 + registry (offline-capable) | **Already independent** of Supabase (`verifyReceiptIndependently`) |
| **Backups** | Build #552 encrypted `pg_dump` | Same tooling against `ABRAXAS_DATABASE_URL` |

Demo data (`ocntwbxarpjeixdnzide`) is **non-customer staging**; inventory and retention follow Build #552 — no deletion in this build.

## Architecture (minimal production-grade)

```
┌─────────────────────────────────────────────────────────┐
│ Abraxas Passport API (Next.js)                          │
│  Identity path: holder subjects, wallet auth challenges │
│  Legacy path: zkLogin / PostgREST (explicit flag)      │
└───────────────┬─────────────────────┬───────────────────┘
                │ postgres_direct      │ postgrest (legacy)
                ▼                      ▼
┌───────────────────────────┐   ┌─────────────────────┐
│ Abraxas PostgreSQL         │   │ Supabase PostgREST   │
│ (portable migrations)      │   │ (demo compatibility) │
└───────────────┬───────────┘   └─────────────────────┘
                │
                ▼
┌───────────────────────────┐     ┌─────────────────────┐
│ Build #552 encrypted backup│     │ Encrypted evidence   │
│ pg_dump + manifest         │     │ filesystem store     │
└───────────────────────────┘     └─────────────────────┘
```

### Configuration

| Variable | Purpose |
|----------|---------|
| `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct` | Sovereign identity path |
| `ABRAXAS_DATABASE_URL` | Wire-protocol Postgres (same URL for app + Build #552 backup when on Abraxas PG) |
| `ABRAXAS_POSTGREST_URL` + `ABRAXAS_DB_SERVICE_ROLE_KEY` | Legacy / demo PostgREST (optional aliases to Supabase env) |
| `ABRAXAS_EVIDENCE_STORAGE_ROOT` | Encrypted identity evidence directory |
| `ABRAXAS_EVIDENCE_ENCRYPTION_KEY` | 32-byte base64 (or reuse backup key) |
| `ABRAXAS_PG_POOL_MAX` | Bounded pool size (default `8`) |
| `ABRAXAS_PG_IDLE_TIMEOUT_MS` / `ABRAXAS_PG_CONNECT_TIMEOUT_MS` | Connection lifecycle bounds |
| `ABRAXAS_PG_SSL` / `ABRAXAS_PG_SSL_REJECT_UNAUTHORIZED` | TLS for non-localhost URLs (`require` by default) |
| Build #552 vars | `ABRAXAS_BACKUP_ENCRYPTION_KEY`, backup output dir, restore disposable URL |

### PostgreSQL connection security (`pgPool.ts`)

- **TLS:** Non-localhost `ABRAXAS_DATABASE_URL` hosts use SSL with certificate verification unless `ABRAXAS_PG_SSL_REJECT_UNAUTHORIZED=0`.
- **Pool bounds:** `max`, idle timeout, and connect timeout prevent unbounded connections.
- **Transactions:** `withAbraxasPgTransaction` always `ROLLBACK`s on failure before releasing the client.
- **Credentials:** Connection strings come from environment only; never logged by the adapter.
- **Schema grants:** Migration **136** revokes `public`/`anon`/`authenticated` on holder tables; app role should match `service_role`-scoped grants (insert/select only where required).

### Portable migrations

Canonical SQL: `supabase/migrations/` (apply with standard Postgres tooling). Core sovereign slice: **134–136** (wallet auth + holder subjects); IDV activation **021, 036, 037, 050, 051, 079, 137** on **restore DB only** until authorized on demo.

### Chain / anchoring

Solana/EVM on-chain gates remain **optional** for independently verifiable policy conformance (`verifyReceiptIndependently` + conformance vectors). No personal data on-chain; no new transactions in this build.

## Code map

| Module | Role |
|--------|------|
| `lib/persistence/env.ts` | Backend resolution |
| `lib/persistence/pgPool.ts` | `pg` pool |
| `lib/persistence/holderSubjectDirect.ts` | Holder subject + wallet bindings |
| `lib/persistence/authChallengeDirect.ts` | Auth challenge insert/consume via SQL |
| `lib/persistence/evidenceBlobStore.ts` | Encrypted evidence files |
| `lib/auth/holderSubject/service.ts` | Compatibility router (direct vs PostgREST) |
| `lib/databaseRecovery/*` | Encrypted backup/restore (Build #552) |

## Founder provisioning checklist (minimal)

1. **PostgreSQL 16+** (managed or self-hosted) with TLS and role scoped to Abraxas migrations.
2. **Secrets:** `ABRAXAS_DATABASE_URL`, backup encryption key, evidence encryption key (separate custody).
3. **Apply migrations** 134–136 (+ app-required schema) on Abraxas PG.
4. **Evidence volume** (encrypted disk or object store mounted at `ABRAXAS_EVIDENCE_STORAGE_ROOT`).
5. **Backup runner** with Build #552 scripts; offsite `.enc` + manifest storage.
6. **Disposable restore VM** for quarterly drills (`ABRAXAS_RESTORE_DATABASE_URL`).
7. **Cutover:** set `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct` on identity-facing services; keep PostgREST env only for legacy zkLogin until retired.

## Proof commands

```bash
export ABRAXAS_PERSISTENCE_BACKEND=postgres_direct
export ABRAXAS_DATABASE_URL='postgresql://…'
npm run test:sovereign-runtime
npm run sovereign-runtime:disposable-proof
```

## Remaining blockers (post–Build #553)

- Full Next.js app on `postgres_direct` without dual PostgREST for **legacy zkLogin** reads (`passportWalletAuth/identity.ts` still queries `sui_zklogin_identities` via PostgREST).
- Demo cutover: `DEMO_SUPABASE_DATABASE_URL` backup certification (Build #552) before shared DDL.
- Production deploy and Supabase decommission — **explicitly out of scope**.
