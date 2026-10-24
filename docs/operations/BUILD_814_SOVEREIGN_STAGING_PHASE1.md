# Build #814 — Sovereign persistence Phase 1 (staging + shadow parity)

**Status:** Phase 1 engineering · **Production writer unchanged**

## Objective

Prove Abraxas can evaluate **receipt provenance** and **metering idempotency** through an **Abraxas-controlled PostgreSQL path** without Supabase SDK, while **Production remains the sole authoritative writer**.

PostgreSQL is an **operational persistence candidate**, not the cryptographic trust root.

## Persistence architecture (as implemented in code)

| Layer | Location | Role |
|-------|----------|------|
| Legacy operational writer | `requirePersistenceAdmin()` → PostgREST (`lib/persistence/admin.ts`) | **Production authority today** |
| Direct PG (partial) | `lib/persistence/pgPool.ts`, passport/native hybrid | Existing vertical paths |
| **Boundary (new)** | `lib/persistence/boundary/*` | Config, isolation guards, sovereign staging pool, shadow parity |
| Crypto trust | `lib/decisionReceipts/signing`, `verifyRecordSignature` | **Independent of any database** |

## Vertical slice (Phase 1)

1. **Receipt provenance** — `verticalSlice/receiptProvenance.ts` (payload hash, signature, policy/partner binding, lifecycle)  
2. **Metering attribution** — `verticalSlice/meteringAttribution.ts` (idempotency key presence and linkage)

Shadow compare: `shadow/runVerticalSliceParity.ts` — **invariant parity**, not row-count equality.

## Configuration

| Variable | Purpose |
|----------|---------|
| `ABRAXAS_SOVEREIGN_ENV_CLASS` | `staging` or `disposable` for non-Production sovereign work |
| `ABRAXAS_SOVEREIGN_STAGING_PG_URL` | Sovereign Postgres URL (must **not** be Production ref `bztwutzprwsdrtqdpymf`) |
| `ABRAXAS_SHADOW_PERSISTENCE_COMPARE` | `true` / `compare` — read-only shadow parity mode |
| `ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES` | `true` — allow **fixture** inserts on disposable only |
| `ABRAXAS_PERSISTENCE_BACKEND` | `postgres_direct` on sovereign staging hosts |

**Forbidden together:** `ABRAXAS_SHADOW_PERSISTENCE_COMPARE` + `ABRAXAS_SOVEREIGN_STAGING_WRITES`.

## Local / disposable deployment contract

1. Provision **non-Production** Postgres (local Docker or disposable CI URL).  
2. Set `ABRAXAS_SOVEREIGN_ENV_CLASS=disposable`, `ABRAXAS_DISPOSABLE_PG_MIGRATION_AUTHORIZED=true`, disposable URL envs per `lib/persistence/disposablePgMigrationTestGuard.ts`.  
3. Apply minimal migrations: `033_decision_receipts.sql` (with prerequisites) and `058_partner_metering_foundation.sql` for slice tables.  
4. Run shadow parity tests: `npx vitest run lib/persistence/boundary/persistenceBoundary.adversarial.test.ts`

This is **not** Production-ready sovereign infrastructure until backup/restore drill and staging env class validation pass (`validateStagingPersistentEnv`).

## Security isolation evidence

- `isolationGuard.ts` blocks Production Supabase project ref and shared endpoints with `DATABASE_URL`.  
- Shadow mode rejects staging write flags.  
- No credentials or holder evidence in parity snapshots (receipt provenance excludes PII fields from compare surface).

## Adversarial tests (CI)

`lib/persistence/boundary/persistenceBoundary.adversarial.test.ts` covers:

- Production legacy authority default  
- Shadow read-only enforcement  
- Production ref forbidden  
- Policy/signature/metering invariant failures  
- Offline signature verification without DB  

## Next phase (Build #815+)

- Reproducible sovereign **staging** host + `validateStagingPersistentEnv` green  
- Backup/restore drill with distinct restore endpoint (`sovereignRestoreSafety`)  
- Expand boundary adapters incrementally (revocation/current validity read path) — **not** 450 call site rewrite  

## Production gates (unchanged)

No cutover, credential rotation, native auth, or billing without explicit founder approval (`productionChangeControl.ts`).
