# Build #551 — Migration 136 security review

## Scope

Migration file: `supabase/migrations/136_passport_holder_subjects.sql`

**Authorization status:** **NOT APPLIED** to shared demo, staging, or Production. Review-only until explicit founder authorization per environment.

## Schema diff (additive)

| Object | Purpose |
| --- | --- |
| `passport_holder_subjects` | Canonical `abx_hs_*` subjects |
| `passport_holder_wallet_accounts` | CAIP-10 bindings (`caip10` unique) |
| `passport_holder_legacy_links` | Legacy key → subject (`legacy_kind`, `legacy_key` PK) |
| `passport_evm_auth_challenges` | EIP-4361/SIWE challenges + atomic consume RPC |
| `passport_solana_auth_challenges` | Solana signed-message challenges + atomic consume RPC |
| `identity_verifications.holder_subject_id` | Chain-neutral credential ownership column + partial index |

## Interactions with existing Passport / IDV

- **Legacy Sui / zkLogin:** Unchanged. `sui_zklogin_identities`, legacy `identity_verifications.wallet_address` / `sui_address` rows, and Abraxas-signed browser sessions keyed by Sui remain authoritative until an operator runs an explicit legacy-link backfill.
- **Chain-neutral wallet auth (post-apply):** New subjects and bindings live only in migration 136 tables. Application code gates EVM/Solana routes and chain-neutral IDV on `chainNeutralIdentitySchemaReady()` (`lib/persistence/chainNeutralSchemaReady.ts`).
- **Pre-apply (#676 on Production without 136):** Legacy authentication and IDV continue; chain-neutral paths return **503** `chain_neutral_schema_unavailable` — no silent fallback to Sui identity or elevated privileges.
- **IDV propagation:** After apply, approved Veriff/manual rows may set `holder_subject_id` alongside `wallet_address = abx_hs_*`. Rows created before apply remain keyed by legacy columns only until backfill.

## Security properties validated (design review)

- **Uniqueness:** One wallet CAIP-10 globally; one legacy key per kind; subject id format check.
- **Tenant isolation:** RLS enabled; only `service_role` grants (matches existing IDV tables). Application enforces partner tenancy; Postgres RLS is defense-in-depth for anon/authenticated roles.
- **Atomic linking:** Challenge consume functions use single-row `UPDATE … RETURNING` with expiry + consumed guards.
- **Legacy compatibility:** No drops or mutations to `sui_zklogin_identities`; legacy links are explicit inserts only.
- **Collision risk:** `abx_hs_*` format disjoint from Sui `0x…`, Solana base58, and EVM addresses used as `wallet_address` on legacy rows.

## Data-preserving recovery plan (preferred over destructive rollback)

Use this when migration 136 must be **disabled** after partial apply, or when rolling forward requires repair — **do not** drop canonical subject data unless legal/compliance mandates destruction.

### 1. Freeze chain-neutral ingress

- Deploy application revision with chain-neutral gates (already in #676) so no new `abx_hs_*` sessions, wallet binds, or IDV writes occur during recovery.
- Revoke or rotate service-role credentials only if compromise is suspected (standard DBA incident response).

### 2. Export canonical state (before any DDL)

Run against the affected environment (operator-controlled backup window):

```sql
copy (
  select subject_id, status, created_at from public.passport_holder_subjects order by created_at
) to stdout with csv header;

copy (
  select id, subject_id, caip10, chain_namespace, chain_reference, account_address, auth_method, verified_at
  from public.passport_holder_wallet_accounts order by verified_at
) to stdout with csv header;

copy (
  select subject_id, legacy_kind, legacy_key, linked_at
  from public.passport_holder_legacy_links order by linked_at
) to stdout with csv header;

copy (
  select wallet_address, sui_address, holder_subject_id, identity_verification_status, credential_status,
         credential_jti, veriff_session_id, last_verified_at, credential_issued_at
  from public.identity_verifications
  where holder_subject_id is not null or wallet_address ~ '^abx_hs_'
  order by updated_at
) to stdout with csv header;
```

Store exports in Abraxas-controlled object storage with encryption and access audit.

### 3. Preserve verification provenance

- **Do not delete** `identity_verification_events`, Veriff decision payloads, manual review artifacts, or `abraxas_credentials` JWT rows tied to legacy keys.
- Map each exported `abx_hs_*` row to its Veriff `vendorData` (`subject:abx_hs_…`) and credential `jti` in a reconciliation spreadsheet before any schema change.

### 4. Forward repair (recommended)

1. Re-apply migration 136 idempotently on a staging clone restored from backup.
2. Re-import exported CSVs with `INSERT … ON CONFLICT DO NOTHING` where constraints allow.
3. Backfill `identity_verifications.holder_subject_id` from export where `wallet_address = abx_hs_*` and column is null.
4. Run disposable Postgres parity tests (`migration136.sqlParity.test.ts`) and application adversarial tests.
5. Re-enable chain-neutral ingress only after founder sign-off per environment.

### 5. Controlled decommission (last resort)

If chain-neutral tables must be removed entirely:

1. Complete steps 1–3 so **no unique holder or wallet binding exists only in 136 tables**.
2. Migrate active credentials to legacy keys via explicit `passport_holder_legacy_links` + IDV row updates (never implicit Sui assignment).
3. Only then drop 136 objects in reverse dependency order (functions → challenge tables → wallet accounts → legacy links → subjects → column).

**Never** use blind `DROP TABLE` rollback on Production while holders still authenticate with `abx_hs_*` JWTs or while IDV rows reference `holder_subject_id`.

## Disposable PostgreSQL tests

Run when `MIGRATION_136_PG_URL` is set (empty database with base migrations applied):

`./node_modules/.bin/vitest run lib/institutionalCertification/migration136.sqlParity.test.ts`

CI parity script: `scripts/ci/run-migration-136-sql-parity.sh` (skips when URL unset).

## EIP-6492 / counterfactual wallets

EIP-1271 verification uses bytecode detection + `isValidSignature` on the configured chain RPC. **EIP-6492** counterfactual / undeployed smart wallets are **out of scope** unless explicitly added; they fail closed with `invalid_signature` or `rpc_unconfigured`.
