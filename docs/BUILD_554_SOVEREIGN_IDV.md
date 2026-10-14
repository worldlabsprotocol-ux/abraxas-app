# Build #554 — Sovereign Passport and IDV

Completes Abraxas-operated **direct PostgreSQL** persistence for the core IDV lifecycle and **encrypted filesystem evidence custody**, building on Build #553 (`postgres_direct`).

## Direct PostgreSQL IDV paths

| Surface | Module |
|---------|--------|
| Verification state + events | `lib/idv/identityVerificationDb.ts` → `idvDirectStore.ts` |
| Review sessions | `lib/idv/identityReviewSession.ts` |
| Biometric assessments | `lib/idv/biometric/persistAssessment.ts` |
| Credential issuance rows | `lib/idv/issueIdentityCredential.ts` |
| Encrypted evidence + custody audit | `lib/idv/sovereignEvidenceStorage.ts` |

## Schema (portable)

Apply on disposable Abraxas PostgreSQL only:

```bash
export ABRAXAS_DATABASE_URL='postgresql://…'
npm run sovereign-idv:apply-schema
```

Includes migrations **136**, demo IDV manifest (**021, 036, 037, 050, 051, 079, 137**), and **138** (consent + evidence custody + access audit).

## Remaining Supabase dependencies (intentional compatibility)

- **Legacy zkLogin** identity reads (`sui_zklogin_identities`)
- **Capture API** document upload to Supabase Storage when `postgres_direct` is off
- **Admin review UI** routes still using PostgREST client when not on sovereign backend
- **Claims / partner** tables not migrated in this build

## Proof

```bash
export ABRAXAS_PERSISTENCE_BACKEND=postgres_direct
export ABRAXAS_DATABASE_URL='postgresql://…'
npm run test:sovereign-runtime
```

Lifecycle test uses **synthetic evidence only** — not a live production verification.

## Recovery (Build #552)

Set `ABRAXAS_BACKUP_SCOPE=sovereign` and `ABRAXAS_DATABASE_URL` for encrypted backup of sovereign IDV tables (see `lib/databaseRecovery/sovereignBackupEnv.ts` and expanded `pgInventory.ts`).
